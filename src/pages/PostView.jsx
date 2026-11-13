import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PostCard from "@/components/PostCard";
import PageLoader from "@/components/PageLoader";
import EmptyState from "@/components/EmptyState";
import { fetchPost } from "@/api/posts";
import { useAuth } from "@/auth/AuthProvider";

export default function PostView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: post, isLoading } = useQuery({ queryKey: ["posts", "one", id, user?.id], queryFn: () => fetchPost(id, user?.id) });
  if (isLoading) return <PageLoader />;
  return (
    <div className="page-narrow">
      {post ? <PostCard post={post} defaultShowComments onDeleted={() => navigate("/feed")} /> : <EmptyState title="הפוסט לא נמצא" text="ייתכן שהוא נמחק." />}
    </div>
  );
}
