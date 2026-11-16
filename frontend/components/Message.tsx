import AlertTriangleIcon from "@/components/icons/AlertTriangleIcon";
import CheckCircleIcon from "@/components/icons/CheckCircleIcon";
import InfoCircleIcon from "@/components/icons/InfoCircleIcon";
import XCircleIcon from "@/components/icons/XCircleIcon";

import type { PropsWithChildren } from "react";

type MessageType = "error" | "info" | "success" | "warning";
type MessageIcon = React.ReactNode;

const icons: Record<MessageType, MessageIcon> = {
  error: <XCircleIcon className="m-1" />,
  info: <InfoCircleIcon className="m-1" />,
  success: <CheckCircleIcon className="m-1" />,
  warning: <AlertTriangleIcon className="m-1" />,
};

const styles: Record<
  MessageType,
  { container: string; icon: string; text: string }
> = {
  error: {
    container: "border-red-3 bg-red-2",
    icon: "text-red-6",
    text: "text-red-6",
  },
  info: {
    container: "border-blue-3 bg-blue-1",
    icon: "text-blue-7",
    text: "text-blue-7",
  },
  success: {
    container: "border-green-3 bg-green-1",
    icon: "text-green-7",
    text: "text-green-7",
  },
  warning: {
    container: "border-orange-3 bg-orange-2",
    icon: "text-orange-6",
    text: "text-orange-6",
  },
};

export default function Message({
  children,
  className,
  hasIcon = false,
  icon,
  title,
  type,
}: PropsWithChildren<{
  className?: string;
  hasIcon?: boolean;
  icon?: MessageIcon;
  title?: React.ReactNode | string;
  type?: MessageType;
}>) {
  const style = type ? styles[type] : undefined;
  const Icon = icon ?? (hasIcon && type ? icons[type] : null);
  const Title =
    typeof title === "string" ? (
      <div className={`${style?.text ?? "text-gray-7"} text-sm font-bold`}>
        {title}
      </div>
    ) : (
      title
    );
  const Content = children ? (
    <div className={`${style?.text ?? "text-gray-7"} text-sm`}>{children}</div>
  ) : null;

  return (
    <div
      className={`flex flex-col justify-center rounded-lg border p-2 text-xs font-medium ${style?.container ?? "border-gray-5"} ${className ?? ""}`}
    >
      <div
        className={`grid ${
          Icon ? "grid-cols-[auto_1fr]" : "grid-cols-1"
        } ${Title ? "mb-2" : ""} items-center gap-1`}
      >
        {Icon ? (
          <div
            className={`${style?.icon ?? "text-gray-5"} min-h-4 min-w-4 self-start`}
          >
            {Icon}
          </div>
        ) : null}
        <div className="px-1 py-1">
          {Title ?? Content}
          {Title ? Content : null}
        </div>
      </div>
    </div>
  );
}
