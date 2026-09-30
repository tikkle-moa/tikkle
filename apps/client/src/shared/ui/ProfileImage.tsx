import { UserRound } from "lucide-react";

interface ProfileImageProps {
  alt: string;
  className: string;
  src: string | null;
}

const ProfileImage = ({ alt, className, src }: ProfileImageProps) => {
  if (src) {
    return <img alt={alt} className={`${className} shrink-0 rounded-full object-cover`} src={src} />;
  }

  return (
    <span aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500`}>
      <UserRound className="size-1/2" />
    </span>
  );
};

export default ProfileImage;
