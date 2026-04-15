"use client";

import {
  CircleUserRoundIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import useHeaderState from "@/hooks/use-header-state";

const getHeaderBackgroundClass = (
  scrolled: boolean,
  _transparent: boolean
): string => {
  return scrolled ? "bg-slate-900 shadow-md" : "bg-transparent";
};

const isPathActive = (
  pathname: string,
  href: string,
  end: boolean
): boolean => {
  if (end) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

interface HeaderProps {
  transparent?: boolean;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this component handles desktop and mobile navigation states in one place.
const Header = ({ transparent = false }: HeaderProps) => {
  const {
    closeMobileMenu,
    closeProfileMenu,
    handleSignOut,
    isAdmin,
    isAuthenticated,
    isMenuOpen,
    isProfileMenuOpen,
    mobileAccountDisplayName,
    navLinks,
    pathname,
    profileDisplayName,
    profileRef,
    scrolled,
    session,
    toggleMobileMenu,
    toggleProfileMenu,
  } = useHeaderState();

  const headerBgClass = getHeaderBackgroundClass(scrolled, transparent);

  const getNavLinkClasses = (isActive: boolean) => {
    const activeClass = isActive ? "text-amber-500" : "text-white";
    return `block relative transition-colors duration-300 pb-1 ${activeClass}`;
  };

  return (
    <header
      className={`sticky top-0 z-50 flex items-center justify-between px-8 py-4 font-bold font-inter text-white text-xl transition-colors duration-500 ${headerBgClass}`}
    >
      <div className="flex flex-1 items-center justify-between md:hidden">
        <Button
          className="z-10 text-white focus:outline-none"
          onClick={toggleMobileMenu}
          type="button"
          variant="ghost"
        >
          <MenuIcon className="h-7 w-7" />
        </Button>
        <Link
          className="absolute left-1/2 flex -translate-x-1/2 transform items-center space-x-1"
          href="/"
        >
          <span className="whitespace-nowrap font-bebas font-bold text-3xl text-white sm:text-4xl">
            BRASIL
          </span>
          <Image
            alt="Logo do Brasil Afora"
            className="h-10 w-auto object-contain"
            height={36}
            src="/logo-20260413.png"
            unoptimized
            width={36}
          />
          <span className="whitespace-nowrap font-bebas font-bold text-3xl text-amber-500 sm:text-4xl">
            AFORA
          </span>
        </Link>
        <div className="h-7 w-7" />
      </div>

      <div className="hidden flex-1 items-center justify-between md:flex">
        <Link className="flex items-center space-x-1" href="/">
          <Image
            alt="Logo do Brasil Afora"
            className="h-11 w-auto object-contain"
            height={44}
            src="/logo-20260413.png"
            unoptimized
            width={44}
          />
          <span className="whitespace-nowrap font-bebas font-bold text-2xl text-white sm:text-3xl">
            BRASIL
          </span>
          <span className="whitespace-nowrap font-bebas font-bold text-2xl text-amber-500 sm:text-3xl">
            AFORA
          </span>
        </Link>

        <nav className="flex flex-1 justify-center">
          <ul className="flex items-center space-x-8">
            {navLinks.map(({ href, label, end }) => {
              const isActive = isPathActive(pathname, href, end);

              return (
                <li className="group" key={href}>
                  <Link className={getNavLinkClasses(isActive)} href={href}>
                    {label}
                    <span
                      className={`absolute bottom-0 left-0 h-0.5 w-full transform bg-amber-500 transition-transform duration-300 ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="relative" ref={profileRef}>
          <Button
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="true"
            className="group flex items-center gap-2.5 rounded-full bg-transparent px-3.5 py-3 text-slate-100 text-xl transition-all duration-300 hover:bg-[#1a315a]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            onClick={toggleProfileMenu}
            type="button"
            variant="ghost"
          >
            {isAuthenticated && session?.user?.image ? (
              <Image
                alt={session.user.name ?? "Foto de perfil"}
                className="h-9 w-9 rounded-full object-cover"
                height={36}
                src={session.user.image}
                unoptimized
                width={36}
              />
            ) : (
              <CircleUserRoundIcon className="h-[30px] w-[30px]" />
            )}
            <span className="max-w-36 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-xl">
              {isAuthenticated ? profileDisplayName : "Perfil"}
            </span>
          </Button>

          {isProfileMenuOpen && (
            <div
              className={`absolute top-full right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-[0_20px_45px_rgba(2,6,23,0.65)] ${isAuthenticated ? "w-80" : "w-56"}`}
            >
              {isAuthenticated ? (
                <>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                    <div className="flex items-center gap-3">
                      {session?.user?.image ? (
                        <Image
                          alt={session.user.name ?? "Foto de perfil"}
                          className="h-10 w-10 rounded-full object-cover"
                          height={40}
                          src={session.user.image}
                          unoptimized
                          width={40}
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-amber-500">
                          <CircleUserRoundIcon className="h-6 w-6" />
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="font-semibold text-amber-500 text-xs uppercase tracking-wide">
                          Minha Conta
                        </p>
                        <p className="truncate font-semibold text-slate-100 text-sm">
                          {session?.user?.name || profileDisplayName}
                        </p>
                        <p className="mt-1 flex items-center gap-2 truncate text-slate-400 text-xs">
                          <MailIcon className="h-[11px] w-[11px] shrink-0" />
                          {session?.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 space-y-2">
                    <Link
                      className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 text-sm transition-colors duration-200 hover:border-amber-500/40 hover:text-amber-500"
                      href="/perfil"
                      onClick={closeProfileMenu}
                    >
                      <UserIcon className="h-3 w-3 text-amber-500" /> Meu Perfil
                    </Link>

                    {isAdmin && (
                      <Link
                        className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 text-sm transition-colors duration-200 hover:border-amber-500/40 hover:text-amber-500"
                        href="/admin"
                        onClick={closeProfileMenu}
                      >
                        <UserIcon className="h-3 w-3 text-amber-500" /> Painel
                        Admin
                      </Link>
                    )}

                    <Separator className="my-1 bg-slate-800" />

                    <Button
                      className="flex w-full items-center justify-start gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-left text-slate-200 text-sm transition-colors duration-200 hover:border-amber-500/40 hover:text-amber-500"
                      onClick={handleSignOut}
                      type="button"
                      variant="ghost"
                    >
                      <LogOutIcon className="h-3 w-3 text-amber-500" /> Sair
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-center font-semibold text-base text-slate-100 transition-colors duration-200 hover:border-amber-500/40 hover:text-amber-500"
                    href="/login"
                    onClick={closeProfileMenu}
                  >
                    <CircleUserRoundIcon className="h-[14px] w-[14px] text-amber-500" />
                    Entrar
                  </Link>
                  <Link
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-center font-semibold text-base text-slate-100 transition-colors duration-200 hover:border-amber-500/40 hover:text-amber-500"
                    href="/cadastro"
                    onClick={closeProfileMenu}
                  >
                    <UserIcon className="h-3 w-3 text-amber-500" />
                    Cadastrar
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Button
        aria-label="Fechar menu"
        className={`fixed inset-0 z-40 h-auto w-full bg-black bg-opacity-75 transition-opacity duration-300 md:hidden ${isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={closeMobileMenu}
        type="button"
        variant="ghost"
      />
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 transform bg-slate-900 shadow-xl transition-transform duration-500 ease-in-out md:hidden ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 flex items-center justify-between border-slate-800 border-b pb-4">
            <h2 className="font-bold text-amber-500 text-xl">Navegação</h2>
            <Button
              className="text-white hover:text-amber-500"
              onClick={closeMobileMenu}
              type="button"
              variant="ghost"
            >
              <XIcon className="h-6 w-6" />
            </Button>
          </div>
          <nav className="mt-4 flex-1">
            <ul className="space-y-4 font-bold text-white">
              {navLinks.map(({ href, label, end }) => {
                const isActive = isPathActive(pathname, href, end);

                return (
                  <li key={href}>
                    <Link
                      className={`block rounded-lg px-4 py-2 transition-colors duration-300 hover:bg-slate-800 ${isActive ? "bg-slate-800 text-amber-500" : ""}`}
                      href={href}
                      onClick={closeMobileMenu}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-auto border-slate-800 border-t pt-4">
            <div className="mb-2 flex items-center gap-2">
              {isAuthenticated && session?.user?.image ? (
                <Image
                  alt={session.user.name ?? "Foto de perfil"}
                  className="h-8 w-8 rounded-full object-cover"
                  height={32}
                  src={session.user.image}
                  unoptimized
                  width={32}
                />
              ) : (
                <CircleUserRoundIcon className="h-5 w-5 text-amber-500" />
              )}
              <h3 className="font-bold text-amber-500 text-lg">
                {isAuthenticated ? mobileAccountDisplayName : "Minha Conta"}
              </h3>
            </div>
            <ul className="space-y-2">
              <li>
                <Link
                  className="block rounded-lg px-4 py-2 transition-colors hover:bg-slate-800"
                  href={isAuthenticated ? "/perfil" : "/login"}
                  onClick={closeMobileMenu}
                >
                  Meu Perfil
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link
                    className="block rounded-lg px-4 py-2 transition-colors hover:bg-slate-800"
                    href="/admin"
                    onClick={closeMobileMenu}
                  >
                    Painel Admin
                  </Link>
                </li>
              )}
              {isAuthenticated ? (
                <li>
                  <Button
                    className="block w-full rounded-lg px-4 py-2 text-left text-red-400 transition-colors hover:bg-slate-800"
                    onClick={handleSignOut}
                    type="button"
                    variant="ghost"
                  >
                    Sair
                  </Button>
                </li>
              ) : (
                <>
                  <li>
                    <Link
                      className="block rounded-lg px-4 py-2 transition-colors hover:bg-slate-800"
                      href="/login"
                      onClick={closeMobileMenu}
                    >
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="block rounded-lg px-4 py-2 transition-colors hover:bg-slate-800"
                      href="/cadastro"
                      onClick={closeMobileMenu}
                    >
                      Cadastrar
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
