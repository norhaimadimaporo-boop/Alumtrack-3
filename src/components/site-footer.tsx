import { Link } from "@tanstack/react-router";
import { Facebook, Mail, MapPin, Phone, Clock } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-4 border-brand bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold">AlumTrack</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-background/70">
            Alumni Tracing System and Online Platform for Mindanao State University — Main
            Campus, Marawi City.
          </p>
          <div className="mt-5 flex gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-sm border border-background/25 transition-colors hover:bg-brand">
              <Facebook className="size-4" />
            </span>
            <span className="inline-flex size-9 items-center justify-center rounded-sm border border-background/25 transition-colors hover:bg-brand">
              <Mail className="size-4" />
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-highlight">
            Quick Links
          </p>
          <ul className="mt-4 space-y-2 text-sm text-background/75">
            <li>
              <Link to="/" className="hover:text-highlight">
                Home
              </Link>
            </li>
            <li>
              <Link to="/search" className="hover:text-highlight">
                Search Alumni
              </Link>
            </li>
            <li>
              <Link to="/news" className="hover:text-highlight">
                News &amp; Events
              </Link>
            </li>
            <li>
              <Link to="/oarcc" className="hover:text-highlight">
                About OARCC
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-highlight">
                Alumni Login
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-highlight">
                Register
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-highlight">
            Office of Alumni Relations and Career Center
          </p>
          <ul className="mt-4 space-y-3 text-sm text-background/75">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-highlight" />
              Ground Floor, Isidro Hall Building, 2nd Street, MSU, Marawi City, Lanao del
              Sur
            </li>
            <li className="flex gap-2">
              <Phone className="size-4 shrink-0 text-highlight" />
              0956-739-3998
            </li>
            <li className="flex gap-2">
              <Mail className="size-4 shrink-0 text-highlight" />
              msuoarcc@gmail.com
            </li>
            <li className="flex gap-2">
              <Clock className="size-4 shrink-0 text-highlight" />
              Monday – Friday, 8:00 A.M. – 5:00 P.M.
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-background/15 py-5 text-center text-xs text-background/55">
        © {new Date().getFullYear()} AlumTrack — MSU Main Campus. Capstone Project, College
        of Information and Computing Sciences.
      </div>
    </footer>
  );
}