import { Input } from "@headlessui/react";
import { useImperativeHandle, useMemo, useRef } from "react";
import { type FieldError, useFormContext } from "react-hook-form";

import Field from "@/components/Field";
import tw from "@/lib/tw";

import type { ChangeEvent, InputHTMLAttributes, ReactElement } from "react";

type InputType = "file" | "float" | "integer" | "password" | "text";

export const baseClassName = tw`focus:border-blue-4 focus:ring-blue-6/25 disabled:bg-gray-2 disabled:text-gray-6 w-full border px-3 py-2 text-xs shadow-xs focus:ring-4 focus:outline-hidden`;

function isNumberType(type: InputType) {
  return type === "float" || type === "integer";
}

function parseNumber(value: null | number | string) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value.replace(",", "."));
  }

  return Number.NaN;
}

export default function AlmaInput({
  "data-test": dataTest,
  disabled,
  icon,
  max,
  min,
  placeholder,
  required,
  suffix,
  type = "text",
  validate,
  ...props
}: {
  className?: string;
  "data-test"?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  icon?: ReactElement;
  max?: number;
  min?: number;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  suffix?: string;
  type?: InputType;
  validate?: (v: null | number | string) => string | undefined;
} & ({ error?: FieldError; label: string; value: string } | { name: string })) {
  const { formState, getFieldState, register } = useFormContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, ...inputProps } =
    "name" in props
      ? register(props.name, {
          disabled,
          max,
          min,
          required,
          setValueAs: (value: null | number | string) => {
            if (isNumberType(type) && typeof value === "string") {
              return value === "" ? null : Number(value.replace(",", "."));
            }
            return value;
          },
          validate:
            validate ??
            ((value: null | number | string) => {
              if (isNumberType(type) && value !== "" && value !== null) {
                const number = parseNumber(value);
                if (Number.isFinite(number) === false) {
                  return false;
                }
                if (type === "integer" && Number.isInteger(number) === false) {
                  return false;
                }
                return (
                  (min === undefined || number >= min) &&
                  (max === undefined || number <= max)
                );
              }
              return true;
            }),
          value: null,
        })
      : {
          disabled,
          onChange: props.onChange,
          readOnly: disabled,
          ref: inputRef,
          value: props.value,
        };

  useImperativeHandle(ref, () => {
    return inputRef.current;
  });

  const fieldState =
    "name" in props
      ? getFieldState(props.name, formState)
      : { error: props.error };

  const numberProps: InputHTMLAttributes<HTMLInputElement> = useMemo(() => {
    if (type === "float") {
      return { inputMode: "decimal", type: "text" };
    }

    if (type === "integer") {
      return { inputMode: "numeric", type: "text" };
    }

    return {};
  }, [type]);

  const errorClassName = fieldState?.error
    ? tw`border-red-3 bg-red-2`
    : tw`border-gray-5 bg-white`;

  return (
    <Field {...props} data-test={dataTest} error={fieldState?.error}>
      {suffix || icon ? (
        <div className="relative flex">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              {icon}
            </div>
          )}
          <Input
            className={`${suffix ? "rounded-l-lg" : "rounded-lg"} ${baseClassName} ${errorClassName} ${icon && "pl-9"}`}
            placeholder={placeholder}
            ref={inputRef}
            type={type}
            {...inputProps}
            {...numberProps}
          />
          {suffix && (
            <button
              className="border-gray-5 bg-gray-2 text-gray-7 hover:text-gray-8 disabled:bg-gray-2 disabled:text-gray-6 rounded-r-lg border border-l-0 px-3 py-2 text-xs font-semibold hover:bg-white"
              disabled={disabled ?? formState.disabled}
              onClick={() => {
                return inputRef.current?.focus();
              }}
              type="button"
            >
              {suffix}
            </button>
          )}
        </div>
      ) : (
        <Input
          className={`file:border-gray-5 rounded-lg file:absolute file:right-2 file:-mt-2.25 file:rounded-r-lg file:border file:bg-white file:p-2 ${baseClassName} ${errorClassName}`}
          placeholder={placeholder}
          ref={inputRef}
          type={type}
          {...inputProps}
          {...numberProps}
        />
      )}
    </Field>
  );
}
