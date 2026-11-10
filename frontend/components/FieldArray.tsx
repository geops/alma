import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import ChevronIcon from "@/components/icons/ChevronIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import { ModelContext } from "@/lib/modelContext";
import tw from "@/lib/tw";
import useSetting from "@/lib/useSetting";

import type { ReactNode } from "react";
import type { Control, FieldValues } from "react-hook-form";

const background = {
  1: tw`border-gray-4 bg-gray-2`,
  2: tw`border-gray-5 bg-gray-3`,
  3: tw`border-gray-5 bg-gray-4`,
};

function DataFieldArrayTitle<T>({
  control,
  getTitle,
  index,
  name,
}: {
  control: Control<FieldValues>;
  getTitle: (data: T) => string;
  index: number;
  name: string;
}) {
  const data = useWatch({
    control,
    name: `${name}.${index}`,
  }) as T;
  return <h3 className="text-sm font-semibold">{getTitle(data)}</h3>;
}

export default function FieldArray<T>({
  addLabel,
  children,
  getTitle,
  hideRemoveButton,
  level = 1,
  maxItems,
  model,
  name,
  required,
  simple,
  value,
  ...props
}: {
  addLabel: string;
  children: (index: number) => ReactNode;
  getTitle?: (data: T) => string;
  hideRemoveButton?: boolean;
  level?: 1 | 2 | 3;
  maxItems?: number;
  model: string;
  name: string;
  required?: boolean | number;
  simple?: boolean;
  value: T;
}) {
  const { control, formState } = useFormContext();
  const { append, fields, remove } = useFieldArray({ control, name });
  const fieldName = name.split(".").pop();
  const hidden =
    useSetting(`ui.fields.${model}.${fieldName}.hidden`, false).at(0) === true;
  const hideAddButton =
    formState.disabled ||
    (typeof maxItems === "number" &&
      Number.isInteger(maxItems) &&
      maxItems > 0 &&
      fields.length >= maxItems);

  if (hidden) {
    return null;
  }

  const addButton = (
    <button
      className={`text-gray-7 hover:text-gray-9 flex items-center space-x-1.5 text-sm font-semibold ${simple ? "mt-3" : ""}`}
      data-test="FieldArrayAddButton"
      onClick={() => {
        return append(value, { shouldFocus: false });
      }}
      type="button"
    >
      <PlusIcon />
      <span>{addLabel}</span>
    </button>
  );

  if (level === 1 && getTitle) {
    return (
      <ModelContext.Provider value={model}>
        <div className="space-y-4" {...props}>
          {fields.map((field, index) => {
            return (
              <Disclosure
                as="div"
                className={`group rounded-lg border p-4 ${background[level]}`}
                defaultOpen
                key={field.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <DisclosureButton className="border-gray-5 text-gray-7 flex h-10 w-10 items-center justify-center rounded-full border">
                      <ChevronIcon className="rotate-180 transition-transform group-data-open:rotate-0" />
                    </DisclosureButton>
                    {getTitle ? (
                      <DataFieldArrayTitle<T>
                        control={control}
                        getTitle={getTitle}
                        index={index}
                        name={name}
                      />
                    ) : null}
                  </div>
                  {formState.disabled ||
                  (required === true && fields.length <= 1) ||
                  index === required ? null : (
                    <button
                      className="border-red-5 bg-red-1 text-red-6 hover:bg-red-2 hover:text-red-7 rounded-lg border p-2.5 shadow-xs"
                      data-test="FieldArray-remove"
                      name={`${name}.${index}.remove`}
                      onClick={() => {
                        return remove(index);
                      }}
                      type="button"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
                <DisclosurePanel className="border-gray-4 mt-4 space-y-6 border-t pt-4">
                  {children(index)}
                </DisclosurePanel>
              </Disclosure>
            );
          })}
          {hideAddButton ? null : addButton}
        </div>
      </ModelContext.Provider>
    );
  }
  return (
    <ModelContext.Provider value={model}>
      <div className={simple ? "" : "space-y-4"} {...props}>
        {fields.map((field, index) => {
          return (
            <div
              className={
                simple
                  ? "border-gray-4 flex space-x-1 border-t"
                  : `relative rounded-lg border p-4 ${background[level]}`
              }
              key={field.id}
            >
              {children(index)}
              {formState.disabled ||
              (required === true && fields.length <= 1) ||
              index === required ||
              hideRemoveButton ? null : (
                <button
                  className={`text-red-6 hover:bg-red-2 hover:text-red-7 p-2.5 ${simple ? "" : "absolute top-2 right-2 mt-0! rounded-lg"}`}
                  name={`${name}.${index}.remove`}
                  onClick={() => {
                    return remove(index);
                  }}
                  type="button"
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          );
        })}
        {hideAddButton ? null : addButton}
      </div>
    </ModelContext.Provider>
  );
}
