# Composition Patterns: Forms & Wizards

Patterns for multi-step forms, validation, and error handling with shadcn/ui.

---

## Multi-Step Wizard

### State Management Hook

```tsx
interface WizardState {
  currentStep: number;
  totalSteps: number;
  data: Record<string, unknown>;
  completedSteps: Set<number>;
}

function useWizard(totalSteps: number) {
  const [state, setState] = useState<WizardState>({
    currentStep: 0,
    totalSteps,
    data: {},
    completedSteps: new Set(),
  });

  const next = () => {
    if (state.currentStep < totalSteps - 1) {
      setState(s => ({
        ...s,
        currentStep: s.currentStep + 1,
        completedSteps: new Set([...s.completedSteps, s.currentStep]),
      }));
    }
  };

  const back = () => {
    if (state.currentStep > 0) {
      setState(s => ({ ...s, currentStep: s.currentStep - 1 }));
    }
  };

  const goTo = (step: number) => {
    if (step >= 0 && step < totalSteps && state.completedSteps.has(step - 1)) {
      setState(s => ({ ...s, currentStep: step }));
    }
  };

  const updateData = (stepData: Record<string, unknown>) => {
    setState(s => ({ ...s, data: { ...s.data, ...stepData } }));
  };

  const isLastStep = state.currentStep === totalSteps - 1;
  const isFirstStep = state.currentStep === 0;

  return { ...state, next, back, goTo, updateData, isLastStep, isFirstStep };
}
```

---

## Progress Indicators

### Stepper (Numbered Circles)

```tsx
interface Step { label: string; description?: string }

function WizardStepper({ steps, currentStep }: { steps: Step[]; currentStep: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
              i < currentStep && "bg-primary border-primary text-primary-foreground",
              i === currentStep && "border-primary text-primary",
              i > currentStep && "border-muted text-muted-foreground"
            )}>
              {i < currentStep ? <Check className="h-5 w-5" /> : i + 1}
            </div>
            <span className="text-xs mt-1 text-muted-foreground">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              "h-0.5 flex-1 min-w-[40px]",
              i < currentStep ? "bg-primary" : "bg-muted"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
```

### Progress Bar

```tsx
function WizardProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Step {currentStep + 1} of {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
```

### Dot Indicators

```tsx
function WizardDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            i === currentStep ? "bg-primary" : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
```

---

## Step Validation

### Validate Before Next

```tsx
const handleNext = async () => {
  const fieldsToValidate = getFieldsForStep(wizard.currentStep);
  const isValid = await form.trigger(fieldsToValidate);

  if (isValid) {
    wizard.updateData(form.getValues());
    wizard.next();
  }
};

function getFieldsForStep(step: number): string[] {
  const stepFields: Record<number, string[]> = {
    0: ['name', 'email'],
    1: ['company', 'role'],
    2: ['plan', 'billing'],
  };
  return stepFields[step] || [];
}
```

### Per-Step Schema

```tsx
const stepSchemas = [
  z.object({ name: z.string().min(1), email: z.string().email() }),
  z.object({ company: z.string().min(1), role: z.string() }),
  z.object({ plan: z.enum(['free', 'pro', 'enterprise']) }),
];

const currentSchema = stepSchemas[wizard.currentStep];
```

---

## Skip/Optional Steps

```tsx
interface Step { label: string; optional?: boolean }

function WizardStep({ step, onSkip, children }: {
  step: Step;
  onSkip?: () => void;
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{step.label}</h2>
        {step.optional && (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip this step
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
```

---

## Error Hierarchy

Display errors at the appropriate level:

| Level | When | Component | Example |
|-------|------|-----------|---------|
| 1. Field | Immediate validation | FormMessage | "Email is invalid" |
| 2. Form Summary | Submit with multiple errors | Alert at top | List of all errors |
| 3. Toast | Async/API errors | Sonner/Toast | "Failed to save" |
| 4. Full Page | 403, 500, critical | Error boundary | "Access denied" |

### Level 1: Field-Level (Inline)

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input placeholder="you@example.com" {...field} />
      </FormControl>
      <FormDescription>We'll never share your email.</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Level 2: Form Summary

```tsx
function FormErrorSummary({ errors }: { errors: Record<string, { message?: string }> }) {
  const errorList = Object.entries(errors);
  if (errorList.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Please fix the following errors:</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4 mt-2">
          {errorList.map(([field, error]) => (
            <li key={field}>{error?.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

// Usage
<FormErrorSummary errors={form.formState.errors} />
```

### Level 3: Async/API Errors

```tsx
import { toast } from "sonner";

const onSubmit = async (data: FormData) => {
  try {
    await api.submit(data);
    toast.success("Changes saved successfully");
  } catch (error) {
    if (error instanceof ApiError) {
      toast.error(error.message);
    } else {
      toast.error("An unexpected error occurred. Please try again.");
    }
  }
};
```

### Level 4: Full Page Error

```tsx
function ErrorPage({ status, message }: { status: number; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-destructive">{status}</h1>
        <p className="text-xl mt-4 text-muted-foreground">{message}</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
```

---

## Collapsible Advanced Options

```tsx
function AdvancedOptions({ children }: { children: React.ReactNode }) {
  return (
    <Collapsible className="border rounded-md">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="flex w-full justify-between p-4">
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced Options
          </span>
          <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

---

## Complete Wizard Example

```tsx
function OnboardingWizard() {
  const wizard = useWizard(3);
  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: wizard.data,
  });

  const steps = [
    { label: "Profile", component: ProfileStep },
    { label: "Company", component: CompanyStep },
    { label: "Plan", component: PlanStep },
  ];

  const CurrentStep = steps[wizard.currentStep].component;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <WizardStepper steps={steps} currentStep={wizard.currentStep} />
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form>
            <CurrentStep form={form} />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={wizard.back}
          disabled={wizard.isFirstStep}
        >
          Back
        </Button>
        <Button onClick={handleNext}>
          {wizard.isLastStep ? "Complete" : "Next"}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## Form Patterns Quick Reference

| Pattern | When | Components |
|---------|------|------------|
| Single page form | Simple forms (3-5 fields) | Form, FormField, Button |
| Multi-step wizard | Complex onboarding, checkout | Above patterns + stepper |
| Inline editing | Tables, quick edits | Input with save on blur |
| Modal form | Quick create/edit | Dialog + Form |
| Drawer form | Detailed edit, side panel | Sheet + Form |

---

*See also: references/patterns-edge.md for loading and error states*
