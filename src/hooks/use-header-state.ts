"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useClickOutside from "@/hooks/use-click-outside";
import { getSession, signOut } from "@/lib/auth-client";

const FIRST_NAME_SPLIT_REGEX = /\s+/;

type HeaderSession = Awaited<ReturnType<typeof getSession>>["data"];

interface HeaderNavLink {
  end: boolean;
  href: string;
  label: string;
}

interface UseHeaderStateResult {
  closeMobileMenu: () => void;
  closeProfileMenu: () => void;
  handleSignOut: () => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isMenuOpen: boolean;
  isProfileMenuOpen: boolean;
  mobileAccountDisplayName: string;
  navLinks: HeaderNavLink[];
  pathname: string;
  profileDisplayName: string;
  profileRef: React.RefObject<HTMLDivElement | null>;
  scrolled: boolean;
  session: HeaderSession;
  toggleMobileMenu: () => void;
  toggleProfileMenu: () => void;
}

const getFirstName = (name?: string | null): string => {
  return name?.trim().split(FIRST_NAME_SPLIT_REGEX)[0] ?? "";
};

const useHeaderState = (): UseHeaderStateResult => {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [session, setSession] = useState<HeaderSession>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const isSessionLoadingRef = useRef(false);

  const isAuthenticated = !!session?.user;
  const firstName = getFirstName(session?.user?.name);
  const profileDisplayName = firstName || "Perfil";
  const mobileAccountDisplayName = firstName || "Minha Conta";
  const isAdmin =
    ((session?.user as { role?: string } | undefined)?.role ?? "") === "admin";

  const shouldPrefetchSession =
    pathname.startsWith("/perfil") || pathname.startsWith("/admin");

  const loadSession = useCallback(async () => {
    if (isSessionLoadingRef.current) {
      return;
    }

    isSessionLoadingRef.current = true;

    try {
      const response = await getSession();
      setSession(response.data ?? null);
    } finally {
      isSessionLoadingRef.current = false;
    }
  }, []);

  const closeProfileMenu = useCallback(() => {
    setIsProfileMenuOpen(false);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const triggerSessionLoad = useCallback(() => {
    loadSession().catch(() => undefined);
  }, [loadSession]);

  const toggleProfileMenu = useCallback(() => {
    setIsProfileMenuOpen((prev) => {
      const isOpening = !prev;

      if (isOpening) {
        triggerSessionLoad();
      }

      return isOpening;
    });
  }, [triggerSessionLoad]);

  const toggleMobileMenu = useCallback(() => {
    setIsMenuOpen((prev) => {
      const isOpening = !prev;

      if (isOpening) {
        triggerSessionLoad();
      }

      return isOpening;
    });
  }, [triggerSessionLoad]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } finally {
      setSession(null);
      closeProfileMenu();
      closeMobileMenu();
      router.push("/login");
    }
  }, [closeMobileMenu, closeProfileMenu, router]);

  useClickOutside(profileRef, closeProfileMenu);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!shouldPrefetchSession) {
      return;
    }

    triggerSessionLoad();
  }, [shouldPrefetchSession, triggerSessionLoad]);

  const navLinks = useMemo(
    () => [
      { href: "/", label: "Início", end: true },
      {
        href: "/oportunidades/internacionais",
        label: "Internacional",
        end: false,
      },
      { href: "/oportunidades/nacionais", label: "Nacional", end: false },
      { href: "/mapa", label: "Mapa", end: false },
      ...(isAdmin ? [{ href: "/admin", label: "Admin", end: false }] : []),
    ],
    [isAdmin]
  );

  return {
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
  };
};

export default useHeaderState;
