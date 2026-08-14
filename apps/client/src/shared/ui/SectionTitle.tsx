interface SectionTitleProps {
  title: string;
  onClickMore?: () => void;
}

const SectionTitle = ({ title, onClickMore }: SectionTitleProps) => (
  <div className="mb-4 flex items-center justify-between">
    <div>
      <h2 className="text-lg font-bold text-gray-900 sm:text-xl">{title}</h2>
    </div>

    {onClickMore && (
      <button type="button" className="text-brand-primary text-sm font-medium hover:underline" onClick={onClickMore}>
        전체보기
      </button>
    )}
  </div>
);

export default SectionTitle;
