import { captureException } from "@sentry/nextjs";
import { gql } from "graphql-request";
import { isObject } from "lodash";
import { createContext, use, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useI18n } from "@/lib/i18n";
import { ModelContext } from "@/lib/modelContext";

import Dialog from "./Dialog";

import type { Dispatch, PropsWithChildren, SetStateAction } from "react";
import type {
  FieldValues,
  Path,
  UseFormProps,
  UseFormReturn,
} from "react-hook-form";

import type { FormProblemsFragment } from "@/lib/graphql";

type ValidatedData = Record<string, unknown[]>;

const ValidatedDataContext = createContext<{
  setValidatedData: Dispatch<SetStateAction<ValidatedData>>;
  validatedData: ValidatedData;
}>({
  setValidatedData: () => {
    return undefined;
  },
  validatedData: {},
});

export function useValidatedData() {
  return use(ValidatedDataContext);
}

export type Props<T extends FieldValues> = PropsWithChildren<{
  className?: string;
  "data-test"?: string;
  model: string;
  onSubmit?: (
    data: T,
    methods: UseFormReturn<T>,
  ) => Promise<FormProblemsFragment | void> | void;
  ref?: React.Ref<HTMLFormElement>;
  submitInvalid?: boolean;
}> &
  UseFormProps<T>;

function Form<T extends FieldValues>({
  children,
  className = "",
  model,
  onSubmit = () => {
    return undefined;
  },
  ref,
  submitInvalid = false,
  ...props
}: Props<T>) {
  const methods = useForm<T>(props);
  const { t } = useI18n();
  const [errorType, setErrorType] = useState<"exception" | "network">();
  const [, setTick] = useState(0);
  const [validatedData, setValidatedData] = useState<ValidatedData>({});

  const handleSubmit = async () => {
    const data = methods.getValues();
    try {
      const result = await onSubmit(data, methods);
      if (
        result?.__typename === "ProblemGroup" &&
        Array.isArray(result.problems)
      ) {
        result.problems.forEach((p) => {
          methods.setError(p.field as Path<T>, {
            type: `${p.problemCode}.${p.field}`,
          });
        });
        setTick((tick) => {
          return tick + 1;
        }); // force rerender to update view
      }
    } catch (error) {
      console.error(error);
      captureException(error);
      setErrorType(
        isObject(error) &&
          "message" in error &&
          error.message === "Network request failed"
          ? "network"
          : "exception",
      );
    }
  };

  return (
    <FormProvider {...methods}>
      <ModelContext value={model}>
        <ValidatedDataContext value={{ setValidatedData, validatedData }}>
          <form
            className={className}
            data-test={props["data-test"]}
            onSubmit={(event) => {
              event.stopPropagation();
              void methods.handleSubmit(
                handleSubmit,
                submitInvalid ? handleSubmit : undefined,
              )(event);
            }}
            onSubmitCapture={() => {
              void (async () => {
                await methods.trigger(); // trigger validation
                setTick((tick) => {
                  return tick + 1;
                });
              })();
            }}
            ref={ref}
          >
            {children}
          </form>
        </ValidatedDataContext>
      </ModelContext>
      <Dialog
        data-test={
          errorType === "network" ? "Form-networkException" : "Form-exception"
        }
        isOpen={errorType !== undefined}
        onClose={() => {
          return setErrorType(undefined);
        }}
        title={t("Form.exception")}
      >
        {t(
          errorType === "network"
            ? "Form.networkExceptionMessage"
            : "Form.exceptionMessage",
        )}
      </Dialog>
    </FormProvider>
  );
}

Form.fragment = gql`
  fragment FormProblems on ProblemGroup {
    __typename
    problems {
      field
      problemCode
      message
    }
  }
`;

export default Form;
