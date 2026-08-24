import { AlertCircle, Image, Info, LoaderCircle, Sparkles } from "lucide-react";

import { CONCERT_GENRE_MAP, ConcertCard, type CreateConcertRequest } from "@entities/concert";

import ConcertFormInput from "./ConcertFormInput";
import ConcertFormSelect from "./ConcertFormSelect";
import ConcertFormTextarea from "./ConcertFormTextarea";

import type { SubmitState } from "../model/concert-form.types";
import { useConcertForm } from "../model/use-concert-form";

interface ConcertFormProps {
  initialValues?: Partial<CreateConcertRequest>;
  submitLabel: string;
  submitState: SubmitState;
  onSubmit: (values: CreateConcertRequest) => void | Promise<void>;
  onCancel?: () => void;
}

const ConcertForm = ({ initialValues, submitLabel, submitState, onSubmit, onCancel }: ConcertFormProps) => {
  const { isSubmitting, values, errors, updateField, handleSubmit, handlePosterError } = useConcertForm({ submitState, initialValues, onSubmit });

  return (
    <form className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:rounded-2xl" noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 border-b border-slate-200 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-brand-primary/10 text-brand-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Sparkles className="size-5" aria-hidden />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">
                기본 정보 (<span className="text-red-500">*</span> 필수 입력 항목)
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">관객에게 표시될 콘서트 정보를 입력해 주세요.</p>
            </div>
          </div>

          <div className="flex gap-3">
            {onCancel && (
              <button
                className="flex-1 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                disabled={isSubmitting}
                onClick={onCancel}
                type="button"
              >
                취소
              </button>
            )}

            <button
              className="bg-brand-primary flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}

              {isSubmitting ? "저장 중..." : submitLabel}
            </button>
          </div>
        </div>
        {submitState.status === "error" && (
          <p className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {submitState.error}
          </p>
        )}
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="p-3 sm:p-4 lg:p-6">
          <div className="space-y-7">
            <ConcertFormInput
              field="title"
              label="콘서트 제목"
              isSubmitting={isSubmitting}
              placeholder="콘서트 제목을 입력하세요"
              value={values.title}
              error={errors.title}
              updateField={updateField}
              required
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <ConcertFormSelect
                field="genre"
                label="장르"
                isSubmitting={isSubmitting}
                value={values.genre}
                options={Object.entries(CONCERT_GENRE_MAP).map(([genre, { label }]) => ({ value: genre, label }))}
                error={errors.genre}
                updateField={updateField}
                required
              />

              <ConcertFormInput
                field="placeName"
                label="공연 장소"
                isSubmitting={isSubmitting}
                placeholder="예: 올림픽공원 KSPO DOME"
                value={values.placeName}
                error={errors.placeName}
                updateField={updateField}
                required
              />
            </div>

            <ConcertFormInput
              field="posterUrl"
              label="포스터 URL"
              isSubmitting={isSubmitting}
              placeholder="https://example.com/poster.jpg"
              value={values.posterUrl}
              error={errors.posterUrl}
              updateField={updateField}
            />

            <ConcertFormTextarea
              field="description"
              label="콘서트 설명"
              isSubmitting={isSubmitting}
              placeholder="콘서트에 대한 상세 설명을 입력하세요"
              value={values.description}
              error={errors.description}
              updateField={updateField}
            />
          </div>
        </section>

        <aside className="border-t border-slate-200 bg-slate-50 p-6 sm:p-8 lg:border-t-0 lg:border-l">
          <div className="lg:sticky lg:top-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                <Image className="size-4" aria-hidden />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">미리보기</p>
                <p className="mt-0.5 text-xs text-slate-500">목록에서 보이는 카드 형태입니다.</p>
              </div>
            </div>

            <div className="mx-auto max-w-70 lg:max-w-none">
              <ConcertCard
                concert={{ id: -1, ...values, genre: values.genre || "BALLAD", createdAt: new Date().toISOString() }}
                performances={[]}
                displayOptions={{ showGenre: true, showTitle: true, showPlaceName: true, showPeriod: false }}
                effectOptions={{ disableTilt: true, disableScale: true, disableGlare: true }}
                onPosterError={handlePosterError}
              />
            </div>

            <div className="mt-5 flex gap-2.5 rounded-lg border border-violet-100 bg-violet-50 px-3.5 py-3 text-xs leading-5 text-violet-700">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              세로형 포스터 이미지를 사용하면 카드 비율에 가장 자연스럽게 표시됩니다.
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
};

export default ConcertForm;
