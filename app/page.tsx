import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center tt-gradient-bg px-4 text-center">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-white/95 p-8 shadow-2xl border border-white/20 backdrop-blur-sm">
        
        <div className="mx-auto flex h-30 w-30 items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-md">
          <Image 
            src="/logo-tt.png" 
            alt="Logo Tunisie Telecom" 
            width={80} 
            height={80} 
            className="object-contain"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-[#002F6C]">
             formations TT
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Bienvenue sur l'application
          </p>
        </div>

        <div className="pt-2">
          <Link 
            href="/login" 
            className="inline-block w-full rounded-xl bg-gradient-to-r from-[#0077C8] via-[#00B2A9] to-[#84BD00] p-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition transform active:scale-[0.98]"
          >
            Aller à l'authentification
          </Link>
        </div>
      </div>
    </div>
  );
}