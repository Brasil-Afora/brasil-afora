"use client";

interface FeedbackState {
  message: string;
  type: "error" | "success";
}

interface AdminFeedbackProps {
  feedback: FeedbackState | null;
}

const AdminFeedback = ({ feedback }: AdminFeedbackProps) => {
  if (!feedback) {
    return null;
  }

  const colorClasses =
    feedback.type === "success"
      ? "bg-green-900/40 text-green-200"
      : "bg-red-900/40 text-red-200";

  return (
    <div className={`mb-4 rounded-lg p-3 ${colorClasses}`}>
      {feedback.message}
    </div>
  );
};

export default AdminFeedback;
export type { FeedbackState };
