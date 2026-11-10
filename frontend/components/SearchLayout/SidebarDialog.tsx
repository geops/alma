import {
  CloseButton,
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from "@headlessui/react";

import XIcon from "@/components/icons/XIcon";
import fonts from "@/lib/fonts";

export default function SidebarDialog({
  children,
  icon,
  isOpen,
  onClose,
  subtitle,
  title,
}: React.PropsWithChildren<{
  icon: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  subtitle?: string;
  title: string;
}>) {
  return (
    <Dialog
      className="relative z-50 duration-100 ease-out data-closed:opacity-0"
      onClose={onClose}
      open={isOpen}
    >
      <DialogBackdrop className="bg-gray-7/40 fixed inset-0 backdrop-blur-xs" />
      <DialogPanel
        className={`${fonts} fixed inset-4 ml-auto flex w-96 flex-col rounded-xl bg-white p-4`}
        data-test="SidebarDialog-panel"
      >
        <CloseButton className="absolute top-4 right-4">
          <XIcon className="text-gray-6" />
        </CloseButton>
        <div className="flex gap-4">
          {icon}
          <div className="grow">
            <h2 className="text-md font-medium">{title}</h2>
            <span className="text-gray-6 text-xs">{subtitle}</span>
          </div>
        </div>
        {children}
      </DialogPanel>
    </Dialog>
  );
}
