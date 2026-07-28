import type { OAuthProviderConfig } from "../model/oauth.types";

interface OAuthButtonProps {
  config: OAuthProviderConfig;
  onSelect: () => void;
}

const OAuthButton = ({ config, onSelect }: OAuthButtonProps) => {
  const { label, iconSrc, className, iconClassName } = config;
  return (
    <button
      className={`grid h-14 w-full grid-cols-[1.5rem_1fr_1.5rem] items-center gap-3 rounded-xl border px-5 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${className}`}
      onClick={onSelect}
      type="button"
    >
      <img alt="" aria-hidden="true" className={`h-6 w-6 justify-self-center object-contain ${iconClassName}`} src={iconSrc} />

      <span className="text-center">{label}</span>

      <span aria-hidden="true" />
    </button>
  );
};

export default OAuthButton;
