import {
  CloseButton,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import XIcon from "@/components/icons/XIcon";
import fonts from "@/lib/fonts";

export default function AppDialog({
  children,
  className,
  closeOnClickOutside = true,
  isOpen,
  onClose,
  title,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  closeOnClickOutside?: boolean;
  isOpen: boolean;
  onClose: (value?: boolean) => void; // value = false according to headlessui doc when called by ESC and click outside DialogPanel (that includes click on CloseButton)
  title: string;
}) {
  const Comp = closeOnClickOutside ? DialogPanel : "div";
  return (
    <Dialog
      className={`relative z-50 duration-100 ease-out data-closed:opacity-0 ${className}`}
      onClose={onClose}
      open={isOpen}
      transition
      {...props}
    >
      <DialogBackdrop className="bg-gray-7/40 fixed inset-0 backdrop-blur-xs" />
      <div className="fixed inset-0 flex w-screen items-center justify-center">
        <Comp
          className={`${fonts} mx-8 max-h-[calc(100vh-3.5rem)] overflow-y-auto rounded-xl bg-white p-6`}
          data-dialog="dialog-body"
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <CloseButton className="text-gray-6 hover:bg-gray-2 hover:text-gray-7 -mt-2 -mr-2 rounded-lg p-2">
              <XIcon />
            </CloseButton>
          </div>
          {children}
        </Comp>
      </div>
    </Dialog>
  );
}
