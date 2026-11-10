import { Checkbox } from "@headlessui/react";
import { useFormContext } from "react-hook-form";

import Field from "@/components/Field";
import CheckboxIcon from "@/components/icons/CheckboxIcon";

export default function AlmaCheckbox({
  className,
  disabled,
  ...props
}: (
  | {
      checked: boolean;
      label: string;
      onChange: ((value: boolean) => void) | undefined;
    }
  | { name: string }
) & {
  className?: string;
  disabled?: boolean;
  space?: number;
}) {
  const { formState, getFieldState, register, watch } = useFormContext();

  let checked: boolean;
  let onChange: ((value: boolean) => void) | undefined;
  if ("name" in props) {
    const field = register(props.name, { value: null });
    checked = watch(props.name) as boolean;
    onChange = (value: boolean) => {
      return void field.onChange({ target: { name: props.name, value } });
    };
  } else {
    checked = props.checked;
    onChange = props.onChange;
  }

  return (
    <Field
      inline
      {...props}
      error={
        getFieldState("name" in props ? props.name : "name", formState).error
      }
    >
      <Checkbox
        checked={checked}
        className={`group border-gray-5 flex size-4 shrink-0 items-center justify-center rounded-sm border ${formState.disabled || disabled ? "bg-gray-2 data-checked:bg-gray-5" : "data-checked:border-blue-6 data-checked:bg-blue-6 bg-white"} ${className}`}
        disabled={formState.disabled || disabled}
        name="name"
        onChange={onChange}
      >
        <CheckboxIcon className="text-white opacity-0 group-data-checked:opacity-100" />
      </Checkbox>
    </Field>
  );
}
