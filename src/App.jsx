import { lazy as reactLazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import { GuestOnly, RequireAuth } from "@/auth/guards";
import { useAuth } from "@/auth/AuthProvider";

// After a new deploy, old page files disappear. If a tab still running the
// old version can't load one, reload once to pick up the new version.
const lazy = (load) =>
  reactLazy(() =>
    load().catch((err) => {
      const key = "mh-chunk-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    }).then((mod) => { sessionStorage.removeItem("mh-chunk-reload"); return mod; }),
  );

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Feed = lazy(() => import("@/pages/Feed"));
const PostView = lazy(() => import("@/pages/PostView"));
const Discover = lazy(() => import("@/pages/Discover"));
const Profile = lazy(() => import("@/pages/Profile"));
const ProfileEdit = lazy(() => import("@/pages/ProfileEdit"));
const Messages = lazy(() => import("@/pages/Messages"));
const Collabs = lazy(() => import("@/pages/Collabs"));
const CollabView = lazy(() => import("@/pages/CollabView"));
const Courses = lazy(() => import("@/pages/Courses"));
const CourseView = lazy(() => import("@/pages/CourseView"));
const CourseEditor = lazy(() => import("@/pages/CourseEditor"));
const LessonView = lazy(() => import("@/pages/LessonView"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Settings = lazy(() => import("@/pages/Settings"));
const Terms = lazy(() => import("@/pages/legal/Terms"));
const Privacy = lazy(() => import("@/pages/legal/Privacy"));
const Accessibility = lazy(() => import("@/pages/legal/Accessibility"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to="/feed" replace /> : <Landing />;
}

const auth = (el, opts) => <RequireAuth {...opts}>{el}</RequireAuth>;

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={auth(<Onboarding />, { allowIncompleteProfile: true })} />

        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="/feed" element={auth(<Feed />)} />
          <Route path="/posts/:id" element={<PostView />} />
          <Route path="/discover" element={auth(<Discover />)} />
          <Route path="/u/:username" element={<Profile />} />
          <Route path="/profile/edit" element={auth(<ProfileEdit />)} />
          <Route path="/messages" element={auth(<Messages />)} />
          <Route path="/messages/:conversationId" element={auth(<Messages />)} />
          <Route path="/collabs" element={<Collabs />} />
          <Route path="/collabs/:id" element={<CollabView />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/new" element={auth(<CourseEditor />)} />
          <Route path="/courses/:id" element={<CourseView />} />
          <Route path="/courses/:id/edit" element={auth(<CourseEditor />)} />
          <Route path="/courses/:id/lessons/:lessonId" element={auth(<LessonView />)} />
          <Route path="/notifications" element={auth(<Notifications />)} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/settings" element={auth(<Settings />)} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
