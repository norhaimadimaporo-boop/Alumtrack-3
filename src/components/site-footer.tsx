import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone, Clock, Globe } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-4 border-highlight bg-[#F5EFE6] text-[#5A0012]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-14 md:grid-cols-2 lg:grid-cols-[1.1fr_1.15fr_0.75fr_1.45fr] lg:gap-6">
        <div className="self-start">
          <div className="flex items-center gap-3">
            <img
              src="/assets/msu-logo.png"
              alt="Mindanao State University seal"
              width={474}
              height={474}
              className="h-12 w-auto shrink-0 object-contain"
            />
            <p className="text-sm font-bold uppercase leading-tight tracking-wide text-[#7A1315]">
              Mindanao State University
            </p>
          </div>
          <div className="mt-4 space-y-1 text-sm leading-snug text-[#5A0012]/80">
            <p className="font-bold text-[#7A1315]">Main Campus</p>
            <p>Marawi City</p>
            <p>9700 Lanao del Sur</p>
            <p>Mindanao, Philippines</p>
          </div>
          <a
            href="mailto:oipp@msumain.edu.ph"
            className="mt-2.5 inline-flex max-w-full items-center gap-2 border-b-2 border-[#D4AF37] pb-1 text-sm font-semibold text-[#7A1315] transition-colors hover:text-brand"
          >
            <Mail className="size-4 shrink-0 text-[#D4AF37]" />
            <span className="break-all">oipp@msumain.edu.ph</span>
          </a>
        </div>

        <div className="self-start">
          <div className="flex items-center gap-3">
            <BrandMark className="h-12 w-auto shrink-0" />
            <p className="text-lg font-bold">AlumTrack</p>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#5A0012]/80">
            Alumni Tracing System and Online Platform for Mindanao State University - Main Campus,
            Marawi City.
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="AlumTrack Facebook"
              className="flex size-10 items-center justify-center rounded-full border border-[#D8CFC4] text-[#7A1315] transition-colors hover:bg-[#7A1315] hover:text-white"
            >
              <Facebook className="size-4" />
            </a>
            <a
              href="mailto:officeofalumnirelations01@gmail.com"
              aria-label="Email OARCC"
              className="flex size-10 items-center justify-center rounded-full border border-[#D8CFC4] text-[#7A1315] transition-colors hover:bg-[#7A1315] hover:text-white"
            >
              <Mail className="size-4" />
            </a>
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MSU OARCC Instagram"
              className="flex size-10 items-center justify-center rounded-full border border-[#D8CFC4] text-[#7A1315] transition-colors hover:bg-[#7A1315] hover:text-white"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="https://www.msumain.edu.ph"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MSU Main Campus Website"
              className="flex size-10 items-center justify-center rounded-full border border-[#D8CFC4] text-[#7A1315] transition-colors hover:bg-[#7A1315] hover:text-white"
            >
              <Globe className="size-4" />
            </a>
          </div>
        </div>

        <div className="self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Quick Links
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-[#5A0012]">
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

        <div className="self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Office of Alumni Relations and Career Center
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#5A0012]">
            <li className="flex gap-2 leading-snug">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
              Ground Floor, Isidro Hall Building, 2nd Street, MSU, Marawi City, Lanao del Sur
            </li>
            <li className="flex gap-2">
              <Phone className="size-4 shrink-0 text-brand" />
              <a href="tel:09461617360" className="hover:underline">
                0946-161-7360
              </a>
            </li>
            <li className="flex gap-2">
              <Mail className="size-4 shrink-0 text-brand" />
              <a
                href="mailto:officeofalumnirelations01@gmail.com"
                className="whitespace-nowrap hover:underline"
              >
                officeofalumnirelations01@gmail.com
              </a>
            </li>
            <li className="flex gap-2">
              <Clock className="size-4 shrink-0 text-brand" />
              Monday – Friday, 8:00 A.M. – 5:00 P.M.
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#5A0012]/15 py-5 text-center text-xs text-[#5A0012]/65">
        © {new Date().getFullYear()} AlumTrack - MSU Main Campus. Capstone Project, College of
        Information and Computing Sciences.
      </div>
    </footer>
  );
}
