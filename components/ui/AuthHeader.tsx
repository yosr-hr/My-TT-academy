import Image from "next/image";

interface AuthHeaderProps {
  title: string;
  description?: string;
  titleClassName?: string;
  imageSize?: number;
}

/** Shared logo and heading block used by authentication pages. */
export default function AuthHeader({ title, description, titleClassName = "text-3xl font-black", imageSize = 100 }: AuthHeaderProps) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-30 w-30 items-center justify-center overflow-hidden rounded-full bg-white p-1 shadow-md">
        <Image src="/logo-tt.png" alt="Logo Tunisie Telecom" width={imageSize} height={imageSize} className="object-contain" />
      </div>
      <h2 className={`mt-3 tracking-tight text-[#002F6C] ${titleClassName}`}>{title}</h2>
      {description && <p className="mt-2 text-sm font-medium text-gray-500">{description}</p>}
    </div>
  );
}
