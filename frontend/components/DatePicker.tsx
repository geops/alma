import * as Headless from "@headlessui/react";
import { useState } from "react";
import ReactDatePicker from "react-datepicker";
import { useFormContext, useWatch } from "react-hook-form";

import fonts from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import toLocaleDateString from "@/lib/toLocaleDateString";
import tw from "@/lib/tw";

import Checkbox from "./Checkbox";
import Field from "./Field";

import "react-datepicker/dist/react-datepicker.css";

import type { Validate } from "react-hook-form";

function CalendarIcon() {
  return (
    <svg fill="none" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 6.667H2m8.667-5.334V4M5.333 1.333V4M5.2 14.667h5.6c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874c.218-.428.218-.988.218-2.108v-5.6c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874c-.428-.218-.988-.218-2.108-.218H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 4.187 2 4.747 2 5.867v5.6c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874c.428.218.988.218 2.108.218z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

const isYear = /^[1-9]\d{3}$/;
const shouldDirty = { shouldDirty: true };

function toISODateString(maybeGermanDate: string): string {
  const [day, month, year] = maybeGermanDate.split(".");
  const isoDateString =
    year && month && day
      ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      : null;
  return !isoDateString || Number.isNaN(new Date(isoDateString).getTime())
    ? maybeGermanDate
    : isoDateString;
}

function toLocalISOString(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  return new Date(date.getTime() - tzOffset).toISOString().split("T")[0];
}

export default function DatePicker({
  className,
  disabled,
  hasHeute,
  hasJahr,
  label,
  name,
  onChange,
  required,
  validate,
}: {
  className?: string;
  disabled?: boolean;
  hasHeute?: boolean;
  hasJahr?: boolean;
  label?: string;
  name: string;
  onChange?: (value: string) => void;
  required?: boolean;
  validate?: Validate<unknown, unknown>;
}) {
  const { formState, getFieldState, register, setValue, watch } =
    useFormContext();
  const { t } = useI18n();
  const value = useWatch({ name }) as string;
  const valueHeute = (watch(`${name}heute`) ?? false) as boolean;
  const valueJahr = (watch(`${name}jahr`) ?? false) as boolean;
  const [hasFocus, setHasFocus] = useState(false);

  let displayValue = toLocaleDateString(value);
  if (valueHeute) {
    displayValue = t("zeitraum.bisheute");
  } else if (valueJahr && value) {
    displayValue = new Date(value).getFullYear().toString();
  }

  const [localDisplayValue, setLocalDisplayValue] = useState(displayValue);

  register(name, {
    required,
    validate: (validateValue, formValues) => {
      if (typeof validateValue === "string" && validateValue) {
        const parts = validateValue.split("-");
        if (parts.length !== 3) {
          return t("DatePicker.invalidDate");
        }

        const [yStr, mStr, dStr] = parts;
        const year = parseInt(yStr, 10);
        const month = parseInt(mStr, 10);
        const day = parseInt(dStr, 10);
        if (
          !Number.isInteger(year) ||
          year < 1000 ||
          year > 9999 ||
          !Number.isInteger(month) ||
          month < 1 ||
          month > 12 ||
          !Number.isInteger(day) ||
          day < 1 ||
          day > 31
        ) {
          return t("DatePicker.invalidDate");
        }

        const date = new Date(year, month - 1, day);
        if (
          date.getFullYear() !== year ||
          date.getMonth() + 1 !== month ||
          date.getDate() !== day
        ) {
          return t("DatePicker.invalidDate");
        }
      }

      return validate?.(validateValue, formValues) ?? true;
    },
  });

  const fieldState = getFieldState(name, formState);

  const errorClassName = fieldState?.error ? tw`border-red-3 bg-red-2` : "";

  return (
    <Field name={name} {...(label && { label })} error={fieldState?.error}>
      <div className="relative">
        <Headless.Input
          className={`border-gray-5 focus:border-blue-4 focus:ring-blue-6/25 disabled:bg-gray-2 disabled:text-gray-6 w-full rounded-lg border bg-white px-3 py-2 text-xs shadow-xs focus:ring-4 focus:outline-hidden ${errorClassName} ${className}`}
          disabled={formState.disabled || disabled}
          name={name}
          onBlur={() => {
            setHasFocus(false);
            setLocalDisplayValue("");
          }}
          onChange={(event) => {
            let val = event.target.value;
            setLocalDisplayValue(event.target.value);
            if (event.target.value === "") {
              setValue(name, "", shouldDirty);
              onChange?.(val);
              return;
            }
            if (hasHeute) {
              setValue(`${name}heute`, false);
            }
            if (hasJahr && isYear.exec(event.target.value)) {
              val = `${event.target.value}-01-01`;
              setValue(name, val, shouldDirty);
              setValue(`${name}jahr`, true);
            } else {
              val = toISODateString(event.target.value);
              setValue(name, val, shouldDirty);

              if (hasJahr) {
                setValue(`${name}jahr`, false);
              }
            }
            onChange?.(val);
          }}
          onFocus={() => {
            setHasFocus(true);
            setLocalDisplayValue(displayValue);
          }}
          placeholder="TT.MM.JJJJ"
          // Always use the displayValue when the focus is not on the input otherwise, when set to empty, the localDisplayVValue is still visible.
          // The localDisplayValue is only used when the user is typing in the input, so that the user can see what they are typing.
          value={hasFocus ? localDisplayValue : displayValue}
        />
        <Headless.Popover>
          <Headless.PopoverButton
            className="text-gray-6 enabled:hover:text-gray-7 absolute inset-y-0 right-0 px-2.5"
            disabled={formState.disabled || disabled}
          >
            <CalendarIcon />
          </Headless.PopoverButton>
          <Headless.PopoverPanel
            anchor={{ gap: "8px", padding: "8px", to: "bottom start" }}
            className={`${fonts} border-gray-5 z-20 flex flex-col overflow-hidden rounded-lg border bg-white p-1 shadow-lg`}
          >
            {hasHeute || hasJahr ? (
              <div className="mt-1 mb-2 ml-2 space-y-2">
                {hasHeute ? <Checkbox name={`${name}heute`} /> : null}
                {hasJahr ? <Checkbox name={`${name}jahr`} /> : null}
              </div>
            ) : null}
            <ReactDatePicker
              inline
              onSelect={(date) => {
                if (date) {
                  const val = toLocalISOString(date);
                  setValue(name, val, shouldDirty);
                  onChange?.(val);
                }
              }}
              selected={value ? new Date(value) : null}
              showYearPicker={valueJahr}
            />
          </Headless.PopoverPanel>
        </Headless.Popover>
      </div>
    </Field>
  );
}
