import { Link } from "@tanstack/react-router";
import { Facebook, Mail, MapPin, Phone, Clock } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-4 border-highlight bg-[#F5EFE6] text-[#5A0012]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark className="h-12 w-auto shrink-0" />
            <p className="text-lg font-bold">AlumTrack</p>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#5A0012]/80">
            Alumni Tracing System and Online Platform for Mindanao State University — Main
            Campus, Marawi City.
          </p>
          <div className="mt-5 flex gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-[#5A0012]/25 text-[#5A0012] transition-colors hover:bg-brand hover:text-white">
              <Facebook className="size-4" />
            </span>
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-[#5A0012]/25 text-[#5A0012] transition-colors hover:bg-brand hover:text-white">
              <Mail className="size-4" />
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Quick Links
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#5A0012]">
            <li>
              <Link to="/" className="hover:text-brand">
                Home
              </Link>
            </li>
            <li>
              <Link to="/search" className="hover:text-brand">
                Search Alumni
              </Link>
            </li>
            <li>
              <Link to="/news" className="hover:text-brand">
                Latest Posts
              </Link>
            </li>
            <li>
              <Link to="/oarcc" className="hover:text-brand">
                About OARCC
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-brand">
                Alumni Login
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-brand">
                Register
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Office of Alumni Relations and Career Center
          </p>
          <ul className="mt-4 space-y-3 text-sm text-[#5A0012]">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
              Ground Floor, Isidro Hall Building, 2nd Street, MSU, Marawi City, Lanao del
              Sur
            </li>
            <li className="flex gap-2">
              <Phone className="size-4 shrink-0 text-brand" />
              0956-739-3998
            </li>
            <li className="flex gap-2">
              <Mail className="size-4 shrink-0 text-brand" />
              msuoarcc@gmail.com
            </li>
            <li className="flex gap-2">
              <Clock className="size-4 shrink-0 text-brand" />
              Monday – Friday, 8:00 A.M. – 5:00 P.M.
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#5A0012]/15 py-5 text-center text-xs text-[#5A0012]/65">
        © {new Date().getFullYear()} AlumTrack — MSU Main Campus. Capstone Project, College
        of Information and Computing Sciences.
      </div>
    </footer>
  );
}
