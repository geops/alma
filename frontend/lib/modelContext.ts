import { createContext, use } from "react";

export const ModelContext = createContext("");

export function useModelContext() {
  return use(ModelContext);
}
