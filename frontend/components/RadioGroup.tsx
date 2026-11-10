import { Field, Label, Radio, RadioGroup } from "@headlessui/react";
import { useFormContext, useWatch } from "react-hook-form";

import AlmaField from "@/components/Field";
import CheckboxIcon from "@/components/icons/CheckboxIcon";

interface Option {
  label: string;
  value: string;
}

export default function AlmaRadioGroup({
  disabled,
  name,
  options = [],
  required,
  ...props
}: {
  className?: string;
  disabled?: boolean;
  label?: string;
  name: string;
  options?: Option[];
  required?: boolean;
}) {
  const { formState, getFieldState, register } = useFormContext();
  const { onChange } = register(name, { required, value: null });
  const selectedValue = useWatch({ name }) as Option["value"];
  const fieldState = getFieldState(name, formState);

  return (
    <AlmaField error={fieldState?.error} label={props.label} name={name}>
      <RadioGroup
        className="mt-0.5 space-y-2"
        disabled={disabled ?? formState.disabled}
        name={name}
        onChange={(value) => {
          return void onChange({ target: { name, value } });
        }}
        value={selectedValue}
      >
        {options.map((option) => {
          return (
            <Field className="flex items-center gap-2" key={option.value}>
              <Radio
                className={`group border-gray-5 flex size-4 shrink-0 items-center justify-center rounded-sm border ${formState.disabled || disabled ? "bg-gray-2 data-checked:bg-gray-5" : "data-checked:border-blue-6 data-checked:bg-blue-6 bg-white"}`}
                value={option.value}
              >
                <CheckboxIcon className="text-white opacity-0 group-data-checked:opacity-100" />
              </Radio>
              <Label className="text-gray-7 truncate text-xs font-medium">
                {option.label}
              </Label>
            </Field>
          );
        })}
      </RadioGroup>
    </AlmaField>
  );
}
