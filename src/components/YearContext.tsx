import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { endpoints } from '@/api/endpoints';
import type { AcademicYear } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';

interface YearCtx {
  years: AcademicYear[];
  yearId: number | undefined;
  year: AcademicYear | undefined;
  setYearId: (id: number) => void;
}

const Ctx = createContext<YearCtx>({ years: [], yearId: undefined, year: undefined, setYearId: () => {} });

/** The academic-year switcher in the top bar (Director / Lead). Defaults to the current year. */
export function YearProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: endpoints.years, enabled: status === 'signedIn' });
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const value = useMemo(() => {
    const current = years.find((y) => y.current) || years[0];
    const yearId = selected ?? current?.id;
    return { years, yearId, year: years.find((y) => y.id === yearId), setYearId: setSelected };
  }, [years, selected]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useYear = () => useContext(Ctx);
