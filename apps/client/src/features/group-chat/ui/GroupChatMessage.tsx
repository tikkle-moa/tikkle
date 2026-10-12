import type { GroupChatEventData } from "@tikkle/api-types";

import { formatTime } from "@shared/lib/date.utils";
import ProfileImage from "@shared/ui/ProfileImage";

interface GroupChatMessageProps {
  isMine: boolean;
  messageData: GroupChatEventData;
}

const GroupChatMessage = ({ messageData, isMine }: GroupChatMessageProps) => {
  const { senderNickname, senderProfileImageUrl, sentAt, content } = messageData;

  return (
    <div data-other-message={isMine ? undefined : ""} className={`flex items-start gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine && <ProfileImage src={senderProfileImageUrl} alt={senderNickname} className="size-8" />}
      <div className={`flex min-w-0 flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        <p className="max-w-full truncate px-1 text-xs font-semibold text-gray-500">{isMine ? "나" : senderNickname}</p>
        <div className={`flex max-w-full items-end gap-1.5 ${isMine ? "flex-row-reverse" : ""}`}>
          <p
            className={`min-w-0 rounded-2xl px-3 py-2 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap ${
              isMine ? "rounded-tr-sm bg-violet-600 text-white" : "rounded-tl-sm border border-gray-100 bg-white text-gray-800"
            }`}
          >
            {content}
          </p>
          <time dateTime={sentAt} className="shrink-0 pb-0.5 text-[10px] whitespace-nowrap text-gray-400">
            {formatTime(sentAt, { timeStyle: "short" })}
          </time>
        </div>
      </div>
    </div>
  );
};

export default GroupChatMessage;
