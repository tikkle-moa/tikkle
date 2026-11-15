import { Link, generatePath } from "react-router";

import { ArrowLeft, Crown, RefreshCw, Ticket, UserRoundX, Users } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";
import ConfirmationDialog from "@shared/ui/ConfirmationDialog";
import DetailMessage from "@shared/ui/DetailMessage";
import ProfileImage from "@shared/ui/ProfileImage";

import { useGroupDetailPage } from "../model/use-group-detail-page";

const GroupDetailPage = () => {
  const {
    confirmation,
    handleConfirmAction,
    handleDismissConfirmation,
    currentUser,
    group,
    performance,
    isParamValid,
    isPending,
    isError,
    errorMessage,
    isLeader,
    isKicking,
    isLeaving,
    handleCopyInviteLink,
    handleCopyInviteCode,
    handleKickMember,
    handleLeaveGroup,
    handleRefresh,
  } = useGroupDetailPage();

  if (!isParamValid) {
    return <DetailMessage title="잘못된 그룹입니다." description="올바른 그룹 링크인지 확인해 주세요." />;
  }

  if (isPending) {
    return <div aria-busy="true" aria-label="그룹 정보를 불러오는 중" className="mx-auto h-72 max-w-3xl animate-pulse rounded-3xl bg-gray-100" />;
  }

  if (isError || !group) {
    return (
      <DetailMessage title="그룹 정보를 불러오지 못했습니다." description={errorMessage ?? "초대 링크가 만료되었거나 그룹에 접근할 수 없습니다."} />
    );
  }

  const performancePath = generatePath(ROUTE_PATHS.PERFORMANCE_DETAIL, { performanceId: String(group.performanceId) });

  return (
    <main className="mx-auto max-w-3xl">
      <Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-violet-700" to={performancePath}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        공연 회차로 돌아가기
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-lg shadow-violet-100/50">
        <div className="bg-linear-to-br from-indigo-950 via-violet-950 to-fuchsia-950 px-6 py-7 text-white sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-violet-100">
                <Users aria-hidden="true" className="size-3.5" />
                그룹 예매
              </span>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">함께 예매할 그룹</h1>
              <p className="mt-2 text-sm text-violet-100">{performance?.name ?? `공연 회차 ${group.performanceId}`}</p>
            </div>
            <button
              aria-label="그룹 정보 새로고침"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              onClick={handleRefresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
            </button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-violet-200">
            <Ticket aria-hidden="true" className="size-4" />
            그룹은 {formatDateTime(group.expiresAt)}에 만료됩니다.
          </p>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-8">
          <section aria-labelledby="group-members-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="group-members-title" className="text-base font-bold text-gray-900">
                그룹원
              </h2>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{group.members.length} / 4명</span>
            </div>
            <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-100">
              {group.members.map((member) => (
                <li className="flex items-center gap-3 px-4 py-3" key={member.userId}>
                  <ProfileImage alt={`${member.nickname} 프로필 이미지`} className="size-10" src={member.profileImageUrl} />
                  <span className="min-w-0 grow truncate text-sm font-semibold text-gray-800">{member.nickname}</span>
                  {member.isLeader && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                      <Crown aria-hidden="true" className="size-3.5" />
                      그룹장
                    </span>
                  )}
                  {isLeader && member.userId !== currentUser?.id && (
                    <button
                      aria-label={`${member.nickname} 내보내기`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      disabled={isKicking}
                      onClick={() => handleKickMember(member.userId, member.nickname)}
                      type="button"
                    >
                      <UserRoundX aria-hidden="true" className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="group-invite-title" className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 sm:p-5">
            <h2 id="group-invite-title" className="text-sm font-bold text-gray-900">
              일행 초대하기
            </h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">코드를 입력하거나 초대 링크를 공유해 일행을 초대할 수 있어요.</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-violet-100 bg-white px-4 py-3">
              <div className="min-w-0">
                <span className="block text-[10px] font-semibold text-gray-400">초대 코드</span>
                <strong className="mt-1 block truncate font-mono text-xl font-bold tracking-[0.2em] text-violet-800">
                  {group.inviteCode.toUpperCase()}
                </strong>
              </div>
              <button
                className="shrink-0 rounded-xl border border-violet-200 bg-white px-4 py-3 text-xs font-bold text-violet-700 transition hover:bg-violet-50"
                onClick={() => void handleCopyInviteCode()}
                type="button"
              >
                코드 복사
              </button>
            </div>
            <button
              className="bg-brand-primary mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700"
              onClick={() => void handleCopyInviteLink()}
              type="button"
            >
              초대 링크 공유
            </button>
          </section>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Link
              className="bg-brand-primary inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
              to={performancePath}
            >
              좌석 선택으로 이동
            </Link>
            <button
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={isLeaving}
              onClick={handleLeaveGroup}
              type="button"
            >
              그룹 나가기
            </button>
          </div>
        </div>
      </section>
      {confirmation && (
        <ConfirmationDialog
          title={confirmation.type === "leave" ? "그룹에서 나갈까요?" : `${confirmation.nickname}님을 내보낼까요?`}
          message={confirmation.type === "leave" ? "다시 참여하려면 초대 코드가 필요해요." : "내보낸 그룹원은 초대 코드로 다시 참여할 수 있어요."}
          cancelLabel="취소"
          confirmLabel={confirmation.type === "leave" ? "그룹 나가기" : "내보내기"}
          onCancel={handleDismissConfirmation}
          onConfirm={handleConfirmAction}
        />
      )}
    </main>
  );
};

export default GroupDetailPage;
