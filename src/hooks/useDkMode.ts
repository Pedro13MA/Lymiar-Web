"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "lymiar_dkmode"; // '1' | '0'

function readInitial(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch {
    // ignore
  }
  return false;
}

/**
 * DKMODE — toggla classe `dkmode` no `<html>`.
 * (A troca visual e logos vive em `globals.css`.)
 */
export function useDkMode() {
  const [dk, setDk] = useState(false);

  useEffect(() => {
    const initial = readInitial();
    setDk(initial);
    document.documentElement.classList.toggle("dkmode", initial);
  }, []);

  const toggle = () => {
    setDk((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      document.documentElement.classList.toggle("dkmode", next);
      return next;
    });
  };

  return { dk, toggle };
}

