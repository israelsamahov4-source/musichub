// Security tests for the database rules.
// Each check runs as a real Postgres role (anon / authenticated) with a
// simulated logged-in user, exactly like Supabase does for API requests.
// Run: bash supabase/tests/apply.sh && node supabase/tests/rls.test.mjs
import pg from 'pg';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mh_test' });
await db.connect();

let passed = 0, failed = 0;
const users = {};

async function as(user, sql, params = []) {
  await db.query('begin');
  try {
    if (user === 'server') {
      await db.query(`set local role service_role; set local request.jwt.claim.role = 'service_role'`);
    } else if (user) {
      await db.query(`set local role authenticated; set local request.jwt.claim.role = 'authenticated'`);
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [users[user]]);
    } else {
      await db.query(`set local role anon; set local request.jwt.claim.role = 'anon'`);
    }
    const r = await db.query(sql, params);
    await db.query('commit');
    return r;
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
}

async function ok(name, fn) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { failed++; console.log('  ✗', name, '→', e.message); }
}
async function denied(name, fn) {
  try {
    const r = await fn();
    if (r && r.rowCount === 0 && /^(UPDATE|DELETE|SELECT)/.test(r.command)) { passed++; console.log('  ✓', name, '(0 rows)'); return; }
    failed++; console.log('  ✗', name, '→ was ALLOWED');
  } catch (e) { passed++; console.log("  ✓", name, process.env.VERBOSE ? "[" + e.message + "]" : ""); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };

// --- seed users through the auth trigger
for (const [k, email, meta] of [
  ['alice', 'alice@x.com', { full_name: 'Alice', username: 'alice' }],
  ['bob', 'bob@x.com', { name: 'Bob' }],
  ['carol', 'carol.c@x.com', {}],
  ['dave', 'dave@x.com', { username: 'alice' }], // username taken → falls back
]) {
  const r = await db.query('insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id', [email, meta]);
  users[k] = r.rows[0].id;
}

console.log('\nSign-up');
await ok('profile + free subscription are created on sign-up', async () => {
  const r = await db.query('select p.username, p.full_name, s.tier from public.profiles p join public.subscriptions s on s.user_id = p.id order by p.created_at');
  assert(r.rowCount === 4);
  const names = r.rows.map(x => x.username);
  assert(names.includes('alice') && names.includes('bob') && names.includes('carolc'), names.join());
  assert(new Set(names).size === 4, 'usernames must be unique');
});

console.log('\nProfiles');
await ok('anyone can read public profiles', async () => { assert((await as(null, 'select * from profiles')).rowCount === 4); });
await ok('user edits own profile', async () => { await as('alice', `update profiles set bio = 'guitarist' where id = $1`, [users.alice]); });
await denied('user cannot edit another profile', () => as('bob', `update profiles set bio = 'hacked' where id = $1`, [users.alice]));
await denied('user cannot upgrade own plan', () => as('alice', `update profiles set plan_tier = 'premium' where id = $1`, [users.alice]));
await denied('user cannot make self admin', () => as('alice', `update profiles set is_admin = true where id = $1`, [users.alice]));
await denied('user cannot make self instructor', () => as('alice', `update profiles set is_instructor = true where id = $1`, [users.alice]));
await denied('javascript: links are rejected', () => as('alice', `update profiles set links = '{"website":"javascript:alert(1)"}' where id = $1`, [users.alice]));
await denied('javascript: avatar is rejected', () => as('alice', `update profiles set avatar_url = 'javascript:alert(1)' where id = $1`, [users.alice]));
await denied('invalid username is rejected', () => as('alice', `update profiles set username = 'Al ice!' where id = $1`, [users.alice]));
await denied('user cannot create profiles directly', () => as('alice', `insert into profiles (id, username) values (gen_random_uuid(), 'zzz')`));

console.log('\nSubscriptions');
await ok('user reads own subscription only', async () => { assert((await as('alice', 'select * from subscriptions')).rowCount === 1); });
await denied('anon cannot read subscriptions', () => as(null, 'select * from subscriptions'));
await denied('user cannot change own subscription', () => as('alice', `update subscriptions set tier = 'premium'`));
await denied('user cannot insert subscription', () => as('alice', `insert into subscriptions (user_id, tier) values ($1, 'premium')`, [users.alice]));

console.log('\nPosts, likes, comments');
let postId;
await ok('user creates a post', async () => {
  postId = (await as('alice', `insert into posts (author_id, content) values ($1, 'new song!') returning id`, [users.alice])).rows[0].id;
});
await denied('cannot post as someone else', () => as('bob', `insert into posts (author_id, content) values ($1, 'fake')`, [users.alice]));
await denied('cannot edit someone else\'s post', () => as('bob', `update posts set content = 'x' where id = $1`, [postId]));
await denied('cannot delete someone else\'s post', () => as('bob', `delete from posts where id = $1`, [postId]));
await denied('cannot move a post to another author', () => as('alice', `update posts set author_id = $2 where id = $1`, [postId, users.bob]));
await denied('empty post rejected', () => as('alice', `insert into posts (author_id, content) values ($1, '  ')`, [users.alice]));
await denied('javascript: media rejected', () => as('alice', `insert into posts (author_id, content, media_url) values ($1, 'x', 'javascript:1')`, [users.alice]));
await ok('anon can read posts', async () => { assert((await as(null, 'select * from posts')).rowCount === 1); });
await ok('bob likes and comments', async () => {
  await as('bob', 'insert into post_likes (post_id, user_id) values ($1, $2)', [postId, users.bob]);
  await as('bob', `insert into post_comments (post_id, author_id, content) values ($1, $2, 'nice')`, [postId, users.bob]);
});
await denied('cannot like on behalf of another user', () => as('bob', 'insert into post_likes (post_id, user_id) values ($1, $2)', [postId, users.carol]));
await ok('post author can delete a comment on their post', async () => {
  const r = await as('alice', `delete from post_comments where post_id = $1`, [postId]); assert(r.rowCount === 1);
});

console.log('\nNotifications');
await ok('like created a notification for the author', async () => {
  const r = await as('alice', 'select type from notifications'); assert(r.rows.some(n => n.type === 'post_like'));
});
await denied('others cannot read my notifications', () => as('bob', `select * from notifications where user_id = $1`, [users.alice]));
await denied('users cannot create notifications', () => as('bob', `insert into notifications (user_id, type, message) values ($1, 'system', 'spam')`, [users.alice]));
await denied('users cannot call notify() directly', () => as('bob', `select public.notify($1, $2, 'system', null, 'spam', null)`, [users.alice, users.bob]));
await ok('follow creates a notification', async () => {
  await as('bob', 'insert into follows (follower_id, following_id) values ($1, $2)', [users.bob, users.alice]);
  const r = await as('alice', `select * from notifications where type = 'follow'`); assert(r.rowCount === 1);
});
await denied('cannot follow on behalf of someone else', () => as('bob', 'insert into follows (follower_id, following_id) values ($1, $2)', [users.carol, users.alice]));
await ok('user marks own notification read', async () => {
  const r = await as('alice', `update notifications set read_at = now()`); assert(r.rowCount >= 1);
});

console.log('\nMessages');
let convId;
await ok('alice starts a conversation with bob', async () => {
  convId = (await as('alice', 'select start_conversation($1) as id', [users.bob])).rows[0].id;
  const again = (await as('bob', 'select start_conversation($1) as id', [users.alice])).rows[0].id;
  assert(convId === again, 'conversation should be reused');
});
await ok('both members can send and read', async () => {
  await as('alice', `insert into messages (conversation_id, sender_id, content) values ($1, $2, 'hi bob')`, [convId, users.alice]);
  await as('bob', `insert into messages (conversation_id, sender_id, content) values ($1, $2, 'hi alice')`, [convId, users.bob]);
  assert((await as('bob', 'select * from messages')).rowCount === 2);
});
await ok('inbox shows unread count', async () => {
  const r = await as('alice', 'select * from my_conversations()');
  assert(r.rowCount === 1 && Number(r.rows[0].unread_count) === 1 && r.rows[0].other_username === 'bob');
});
await denied('outsider cannot read the conversation', () => as('carol', 'select * from messages'));
await denied('outsider cannot write into the conversation', () => as('carol', `insert into messages (conversation_id, sender_id, content) values ($1, $2, 'intrude')`, [convId, users.carol]));
await denied('member cannot spoof the sender', () => as('alice', `insert into messages (conversation_id, sender_id, content) values ($1, $2, 'fake')`, [convId, users.bob]));
await denied('outsider cannot join a conversation', () => as('carol', `insert into conversation_members (conversation_id, user_id) values ($1, $2)`, [convId, users.carol]));
await denied('anon cannot read messages', () => as(null, 'select * from messages'));
await ok('block stops messaging', async () => {
  await as('bob', 'insert into blocks (blocker_id, blocked_id) values ($1, $2)', [users.bob, users.alice]);
  let blocked = false;
  try { await as('alice', `insert into messages (conversation_id, sender_id, content) values ($1, $2, 'still here?')`, [convId, users.alice]); }
  catch { blocked = true; }
  assert(blocked, 'message after block should fail');
  let blocked2 = false;
  try { await as('alice', 'select start_conversation($1)', [users.bob]); } catch { blocked2 = true; }
  assert(blocked2, 'new conversation after block should fail');
  await as('bob', 'delete from blocks where blocker_id = $1', [users.bob]);
});

console.log('\nCollaboration projects');
let projId, privId;
await ok('alice creates a public project and is auto-owner', async () => {
  projId = (await as('alice', `insert into collab_projects (owner_id, title) values ($1, 'Summer EP') returning id`, [users.alice])).rows[0].id;
  const r = await as('alice', 'select role, status from collab_members where project_id = $1', [projId]);
  assert(r.rowCount === 1 && r.rows[0].role === 'owner' && r.rows[0].status === 'active');
});
await denied('cannot create a project for someone else', () => as('bob', `insert into collab_projects (owner_id, title) values ($1, 'x x')`, [users.alice]));
await ok('carol requests to join', async () => {
  await as('carol', `insert into collab_members (project_id, user_id, status) values ($1, $2, 'requested')`, [projId, users.carol]);
});
await denied('carol cannot approve herself', () => as('carol', `update collab_members set status = 'active' where project_id = $1 and user_id = $2`, [projId, users.carol]));
await denied('carol cannot join as active directly', () => as('dave', `insert into collab_members (project_id, user_id, status) values ($1, $2, 'active')`, [projId, users.dave]));
await denied('nobody can add a second owner', () => as('dave', `insert into collab_members (project_id, user_id, role, status) values ($1, $2, 'owner', 'requested')`, [projId, users.dave]));
await denied('requester cannot add tasks', () => as('carol', `insert into collab_tasks (project_id, title) values ($1, 'x')`, [projId]));
await ok('owner approves carol; carol can now add tasks', async () => {
  await as('alice', `update collab_members set status = 'active' where project_id = $1 and user_id = $2`, [projId, users.carol]);
  await as('carol', `insert into collab_tasks (project_id, title, assignee_id) values ($1, 'Record bass', $2)`, [projId, users.alice]);
});
await denied('cannot assign a task to a non-member', () => as('carol', `insert into collab_tasks (project_id, title, assignee_id) values ($1, 'x', $2)`, [projId, users.dave]));
await denied('outsider cannot see tasks', () => as('dave', 'select * from collab_tasks'));
await ok('owner invites bob, bob accepts', async () => {
  await as('alice', `insert into collab_members (project_id, user_id, status) values ($1, $2, 'invited')`, [projId, users.bob]);
  await as('bob', `update collab_members set status = 'active' where project_id = $1 and user_id = $2`, [projId, users.bob]);
});
await denied('owner cannot be removed', () => as('carol', `delete from collab_members where project_id = $1 and user_id = $2`, [projId, users.alice]));
await denied('member cannot remove another member', () => as('carol', `delete from collab_members where project_id = $1 and user_id = $2`, [projId, users.bob]));
await ok('private projects are hidden from outsiders', async () => {
  privId = (await as('alice', `insert into collab_projects (owner_id, title, is_public) values ($1, 'Secret', false) returning id`, [users.alice])).rows[0].id;
  assert((await as('dave', 'select * from collab_projects where id = $1', [privId])).rowCount === 0);
  assert((await as(null, 'select * from collab_projects where id = $1', [privId])).rowCount === 0);
});
await denied('cannot request to join a private project', () => as('dave', `insert into collab_members (project_id, user_id, status) values ($1, $2, 'requested')`, [privId, users.dave]));
await ok('owner can delete a project (cascade)', async () => {
  const r = await as('alice', 'delete from collab_projects where id = $1', [privId]); assert(r.rowCount === 1);
});

console.log('\nCourses');
let courseId, lockedLesson, previewLesson;
await denied('free user cannot create a course', () => as('alice', `insert into courses (instructor_id, title) values ($1, 'Guitar 101')`, [users.alice]));
await ok('instructor (granted by server) creates a course with lessons', async () => {
  await as('server', 'update profiles set is_instructor = true where id = $1', [users.alice]);
  courseId = (await as('alice', `insert into courses (instructor_id, title, is_published) values ($1, 'Guitar 101', false) returning id`, [users.alice])).rows[0].id;
  previewLesson = (await as('alice', `insert into lessons (course_id, title, video_url, is_preview, position) values ($1, 'Intro', 'https://youtu.be/a', true, 1) returning id`, [courseId])).rows[0].id;
  lockedLesson = (await as('alice', `insert into lessons (course_id, title, video_url, position) values ($1, 'Chords', 'https://youtu.be/b', 2) returning id`, [courseId])).rows[0].id;
});
await denied('unpublished course is hidden', () => as('bob', 'select * from courses where id = $1', [courseId]));
await denied('cannot enroll in unpublished course', () => as('bob', 'insert into enrollments (course_id, user_id) values ($1, $2)', [courseId, users.bob]));
await ok('publish; outline visible to anon but locked lesson video hidden', async () => {
  await as('alice', 'update courses set is_published = true where id = $1', [courseId]);
  const outline = await as(null, 'select * from course_outline($1)', [courseId]);
  assert(outline.rowCount === 2 && !('video_url' in outline.rows[0]));
  const vis = await as('bob', 'select id from lessons where course_id = $1', [courseId]);
  assert(vis.rowCount === 1 && vis.rows[0].id === previewLesson, 'only preview lesson visible before enrolling');
});
await denied('non-instructor cannot add lessons', () => as('bob', `insert into lessons (course_id, title) values ($1, 'spam')`, [courseId]));
await denied('cannot enroll someone else', () => as('bob', 'insert into enrollments (course_id, user_id) values ($1, $2)', [courseId, users.carol]));
await denied('cannot mark progress before enrolling', () => as('bob', 'insert into lesson_progress (user_id, lesson_id) values ($1, $2)', [users.bob, lockedLesson]));
await ok('bob enrolls in free course and sees all lessons', async () => {
  await as('bob', 'insert into enrollments (course_id, user_id) values ($1, $2)', [courseId, users.bob]);
  assert((await as('bob', 'select id from lessons where course_id = $1', [courseId])).rowCount === 2);
  await as('bob', 'insert into lesson_progress (user_id, lesson_id) values ($1, $2)', [users.bob, lockedLesson]);
});
await ok('instructor can make a course Pro-only', async () => {
  await as('alice', 'update courses set is_free = false where id = $1', [courseId]);
});
await denied('free user cannot enroll in a Pro course', () => as('carol', 'insert into enrollments (course_id, user_id) values ($1, $2)', [courseId, users.carol]));
await ok('Pro user (set by payment webhook) can enroll in a Pro course', async () => {
  await as('server', `update profiles set plan_tier = 'pro' where id = $1`, [users.carol]);
  await as('carol', 'insert into enrollments (course_id, user_id) values ($1, $2)', [courseId, users.carol]);
});
await denied('a non-instructor cannot make a course Pro-only', async () => {
  const id = (await as('server', `insert into courses (instructor_id, title, is_published) values ($1, 'Drums 101', true) returning id`, [users.dave])).rows[0].id;
  return as('dave', 'update courses set is_free = false where id = $1', [id]);
});

console.log('\nSearch & rate limits');
await ok('roles are searchable', async () => {
  await as('bob', `update profiles set musical_roles = '[{"role":"producer","level":"advanced"}]' where id = $1`, [users.bob]);
  const r = await as('carol', `select username from profiles where role_list && array['producer']`);
  assert(r.rowCount === 1 && r.rows[0].username === 'bob');
});
await ok('posting is rate-limited (21st post in an hour is refused)', async () => {
  for (let i = 0; i < 19; i++) await as('bob', `insert into posts (author_id, content) values ($1, 'spam ' || $2)`, [users.bob, i]);
  let refused = false;
  try { await as('bob', `insert into posts (author_id, content) values ($1, 'one more')`, [users.bob]); await as('bob', `insert into posts (author_id, content) values ($1, 'and another')`, [users.bob]); }
  catch (e) { refused = /slow down/.test(e.message); }
  assert(refused, 'expected rate limit');
});

console.log('\nStorage');
await ok('user uploads into own folder', async () => {
  await as('alice', `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${users.alice}/me.png`]);
});
await denied('user cannot upload into another user\'s folder', () => as('bob', `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${users.alice}/evil.png`]));
await denied('user cannot delete another user\'s file', () => as('bob', `delete from storage.objects where name like $1`, [`${users.alice}/%`]));
await denied('anon cannot upload', () => as(null, `insert into storage.objects (bucket_id, name) values ('media', 'x/y.png')`));

console.log('\nAccount deletion');
await ok('deleting an account removes all of the user\'s data', async () => {
  await db.query('delete from auth.users where id = $1', [users.alice]); // what the delete-account function does (auth admin API)
  const left = await db.query(`select
    (select count(*) from profiles where id = $1) p, (select count(*) from posts where author_id = $1) po,
    (select count(*) from collab_projects where owner_id = $1) cp, (select count(*) from auth.users where id = $1) u`, [users.alice]);
  const row = left.rows[0];
  assert(Object.values(row).every(v => Number(v) === 0), JSON.stringify(row));
});

await db.end();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
