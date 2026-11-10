import * as Headless from "@headlessui/react";
import { Fragment } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { anchor } from "@/components/Combobox";
import Field from "@/components/Field";
import CheckIcon from "@/components/icons/CheckIcon";
import ChevronIcon from "@/components/icons/ChevronIcon";
import fonts from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

interface Option {
  disabled?: boolean;
  label: React.ReactNode | string;
  value: boolean | null | number | string;
}

export function useBooleanOptions() {
  const { t } = useI18n();

  return [
    { label: "-", value: null },
    { label: t("boolean.true"), value: true },
    { label: t("boolean.false"), value: false },
  ];
}

export interface Props {
  className?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  multiple?: boolean;
  name: string;
  onChange?: (value: Option["value"] | Option["value"][]) => void;
  options?: Option[];
  required?: boolean;
}

export default function Listbox({
  disabled,
  multiple,
  name,
  onChange,
  options = [],
  required,
  ...props
}: Props) {
  const { formState, getFieldState, register } = useFormContext();
  const { onChange: onChangeRegistered } = register(name, {
    required,
    value: null,
  });
  const selectedValue = useWatch<{
    [name]: Option["value"] | Option["value"][];
  }>({ name });
  const fieldState = getFieldState(name, formState);

  return (
    <Field name={name} {...props} error={fieldState.error}>
      <Headless.Listbox
        disabled={disabled ?? formState.disabled}
        multiple={multiple}
        onChange={(value) => {
          void onChangeRegistered({ target: { name, value } });
          onChange?.(value);
        }}
        value={selectedValue ?? (multiple ? [] : null)}
      >
        <Headless.ListboxButton
          className={`group border-gray-5 disabled:bg-gray-2 disabled:text-gray-6 data-active:border-blue-4 data-active:ring-blue-6/25 flex min-h-8.5 items-center justify-between rounded-lg border px-3 py-2 text-xs shadow-xs data-active:ring-4 data-active:outline-hidden ${fieldState.error ? "border-red-3 bg-red-2" : "bg-white"}`}
          name={name}
        >
          <span className="truncate">
            {options
              .filter((option) => {
                return Array.isArray(selectedValue)
                  ? selectedValue.includes(option.value)
                  : option.value === selectedValue;
              })
              .map((option, index, array) => {
                return (
                  <Fragment key={JSON.stringify(option.value)}>
                    {option.label}
                    {index < array.length - 1 ? ", " : ""}
                  </Fragment>
                );
              })}
          </span>
          <ChevronIcon className="text-gray-6 flex-none rotate-180 transition-transform group-data-active:rotate-0" />
        </Headless.ListboxButton>
        <Headless.ListboxOptions
          anchor={anchor}
          className={`${fonts} border-gray-5 z-30 w-(--button-width) space-y-1 rounded-lg border bg-white p-1 shadow-lg`}
        >
          {options
            .filter((option) => {
              return !option.disabled;
            })
            .map((option) => {
              return (
                <Headless.ListboxOption
                  className="data-selected:bg-gray-2 group data-selected:text-gray-8 text-gray-7 hover:bg-gray-2 hover:text-gray-8 flex cursor-pointer items-center justify-between rounded-md p-2.5 pl-2 text-sm font-medium"
                  key={JSON.stringify(option.value)}
                  value={option.value}
                >
                  {option.label}
                  <CheckIcon className="text-blue-6 hidden shrink-0 group-data-selected:block" />
                </Headless.ListboxOption>
              );
            })}
        </Headless.ListboxOptions>
      </Headless.Listbox>
    </Field>
  );
}
