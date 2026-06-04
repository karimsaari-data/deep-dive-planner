import { createContext, useContext, useState, ReactNode } from "react";

interface ViewModeContextType {
  isMemberPreview: boolean;
  toggleMemberPreview: () => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
  isMemberPreview: false,
  toggleMemberPreview: () => {},
});

export const ViewModeProvider = ({ children }: { children: ReactNode }) => {
  const [isMemberPreview, setIsMemberPreview] = useState(
    () => sessionStorage.getItem("memberPreview") === "true"
  );

  const toggleMemberPreview = () => {
    setIsMemberPreview((prev) => {
      const next = !prev;
      sessionStorage.setItem("memberPreview", String(next));
      return next;
    });
  };

  return (
    <ViewModeContext.Provider value={{ isMemberPreview, toggleMemberPreview }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => useContext(ViewModeContext);
