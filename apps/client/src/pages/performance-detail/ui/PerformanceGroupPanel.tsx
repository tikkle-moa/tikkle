import { ArrowRight, ChevronDown, Crown, RefreshCw, Users } from "lucide-react";

import ProfileImage from "@shared/ui/ProfileImage";

import { usePerformanceGroupPanel } from "../model/use-performance-group-panel";

interface PerformanceGroupPanelProps {
  performanceId: number;
}

const PerformanceGroupPanel = ({ performanceId }: PerformanceGroupPanelProps) => {
  const {
    group,
    isLoading,
    isError,
    isCreating,
    isJoining,
    inviteCode,
    handleInviteCodeChange,
    handleCreateGroup,
    handleJoinGroup,
    handleOpenGroup,
    handleRefresh,
  } = usePerformanceGroupPanel({ performanceId });

  return (
    <details open className="group overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-lg shadow-violet-100/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 bg-violet-50/70 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 ring-1 ring-violet-100">
          <Users aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 grow">
          <h2 className="text-base font-bold text-gray-900">그룹 예매</h2>
          <p className="mt-0.5 text-xs text-gray-500">{group ? `그룹원 ${group.members.length} / 4명` : "일행과 함께 좌석을 선택하세요"}</p>
        </div>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-violet-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 border-t border-violet-100/70 px-5 py-4">
        {isLoading ? (
          <p aria-live="polite" className="text-sm text-gray-500">
            참여 중인 그룹을 확인하고 있어요…
          </p>
        ) : isError ? (
          <p role="alert" className="text-sm text-red-700">
            그룹 정보를 불러오지 못했습니다.
            <button className="mt-2 flex items-center gap-1 text-xs font-semibold underline" onClick={handleRefresh} type="button">
              <RefreshCw aria-hidden="true" className="size-3" /> 다시 불러오기
            </button>
          </p>
        ) : group ? (
          <ul className="space-y-3" aria-label="그룹원">
            {group.members.map((member) => (
              <li className="flex items-center gap-2.5" key={member.userId}>
                <ProfileImage alt={`${member.nickname} 프로필 이미지`} className="size-9" src={member.profileImageUrl} />
                <span className="min-w-0 grow truncate text-sm font-semibold text-gray-800">{member.nickname}</span>
                {member.isLeader && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                    <Crown aria-hidden="true" className="size-3" />
                    그룹장
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <p className="text-sm font-bold text-gray-900">그룹을 만들거나 초대 코드로 참여해 보세요</p>
            <p className="mt-1 text-xs text-gray-500">그룹원은 최대 4명까지 함께할 수 있어요.</p>
          </div>
        )}

        {group ? (
          <button
            className="bg-brand-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
            onClick={handleOpenGroup}
            type="button"
          >
            그룹 관리
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        ) : !isError ? (
          <div className="flex w-full flex-col gap-2">
            <button
              className="bg-brand-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || isCreating || isJoining}
              onClick={handleCreateGroup}
              type="button"
            >
              {isCreating ? "그룹 만드는 중…" : "그룹 만들기"}
            </button>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                handleJoinGroup();
              }}
            >
              <input
                aria-label="초대 코드 입력"
                autoCapitalize="characters"
                className="min-w-0 grow rounded-xl border border-gray-200 px-3 py-2.5 text-sm tracking-wider uppercase transition outline-none placeholder:tracking-normal placeholder:normal-case focus:border-violet-400"
                disabled={isLoading || isCreating || isJoining}
                maxLength={8}
                onChange={(event) => handleInviteCodeChange(event.target.value)}
                placeholder="8자리 초대 코드"
                value={inviteCode}
              />
              <button
                className="shrink-0 rounded-xl border border-violet-200 px-3 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isCreating || isJoining || !inviteCode.trim()}
                type="submit"
              >
                {isJoining ? "참여 중…" : "코드로 참여"}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </details>
  );
};

export default PerformanceGroupPanel;
