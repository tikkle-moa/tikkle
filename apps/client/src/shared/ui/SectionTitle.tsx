interface SectionTitleProps {
  title: string;
  subtitle?: string;
  onClickMore?: () => void;
}

const SectionTitle = ({ title, subtitle, onClickMore }: SectionTitleProps) => (
  <div className="mb-4 flex items-end justify-between">
    <div>
      <h2 className="text-lg font-bold text-gray-900 sm:text-xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>

    {onClickMore && (
      <button type="button" className="text-brand-primary text-sm font-medium hover:underline" onClick={onClickMore}>
        전체보기
      </button>
    )}
  </div>
);

export default SectionTitle;
