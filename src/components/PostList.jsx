import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PostCard from "@/components/PostCard";
import { fetchPosts, PAGE_SIZE } from "@/api/posts";
import { useAuth } from "@/auth/AuthProvider";

/** Infinite list of posts. `filters` is passed to fetchPosts. */
export default function PostList({ queryKey, filters = {}, enabled = true, empty }) {
  const { user } = useAuth();
  const q = useInfiniteQuery({
    queryKey: ["posts", ...queryKey],
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPosts({ ...filters, page: pageParam, userId: user?.id }),
    getNextPageParam: (last, pages) => (last.length === PAGE_SIZE ? pages.length : undefined),
  });

  if (q.isLoading || !enabled) {
    return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>;
  }
  if (q.isError) return <p className="text-center text-destructive">לא הצלחנו לטעון פוסטים. נסו לרענן.</p>;
  const posts = q.data.pages.flat();
  if (!posts.length) return empty ?? null;
  return (
    <div className="space-y-4">
      {posts.map((p) => <PostCard key={p.id} post={p} />)}
      {q.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
            {q.isFetchingNextPage ? "טוען…" : "עוד פוסטים"}
          </Button>
        </div>
      )}
    </div>
  );
}
