import { Textarea } from "@headlessui/react";
import { useFormContext, useWatch } from "react-hook-form";

import Field from "@/components/Field";
import tw from "@/lib/tw";

export default function AlmaTextarea({
  className = "",
  "data-test": dataTest,
  disabled,
  name,
  placeholder,
  rows,
  singleLine = false,
  validate,
}: {
  className?: string;
  "data-test"?: string;
  disabled?: boolean;
  name: string;
  placeholder?: string;
  rows?: number;
  singleLine?: boolean;
  validate?: (v: null | number | string) => string | undefined;
}) {
  const { formState, getFieldState, register } = useFormContext();
  const textareaProps = register(name, { validate });

  const text = useWatch({ name }) as string;

  const fieldState = getFieldState(name, formState);

  const errorClassName = fieldState?.error
    ? tw`border-red-3 bg-red-2`
    : tw`border-gray-5 bg-white`;

  return (
    <Field data-test={dataTest} error={fieldState.error} name={name}>
      <Textarea
        className={`focus:border-blue-4 focus:ring-blue-6/25 disabled:bg-gray-2 disabled:text-gray-6 field-sizing-content max-h-96 rounded-lg border px-3 py-2 text-xs shadow-xs focus:ring-4 focus:outline-hidden ${tw(
          className,
        )} ${errorClassName}`}
        disabled={disabled ?? formState.disabled}
        placeholder={placeholder}
        rows={rows ?? (text && text.length > 0 ? 4 : 1)}
        {...textareaProps}
        onChange={(event) => {
          if (singleLine) {
            event.target.value = event.target.value.replace(/[\r\n]/g, "");
          }
          void textareaProps.onChange(event);
        }}
        onKeyDown={(event) => {
          if (
            singleLine &&
            event.key === "Enter" &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
    </Field>
  );
}
