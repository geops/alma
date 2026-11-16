import AlertCircleIcon from "@/components/icons/AlertCircleIcon";
import Message from "@/components/Message";

export default function FooterWarningMessage({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: React.ReactNode;
}) {
  return (
    <div className="-mx-6 mt-2">
      <hr className="text-gray-5 w-full" />
      <Message
        className="border-gray-5 mx-6 mt-6 max-w-full shadow-lg"
        hasIcon
        icon={<AlertCircleIcon className="text-gray-6 h-10 w-10" />}
        title={<div className="mt-1.5 mb-1 text-sm font-bold">{title}</div>}
      >
        {children}
      </Message>
    </div>
  );
}
