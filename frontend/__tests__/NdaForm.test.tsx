import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NdaForm } from "@/components/NdaForm";
import { defaultNdaFormData, type NdaFormData } from "@/lib/nda-schema";

function Wrapper({ onChange }: { onChange: (data: NdaFormData) => void }) {
  const [data, setData] = useState(defaultNdaFormData);
  return (
    <NdaForm
      data={data}
      onChange={(next) => {
        setData(next);
        onChange(next);
      }}
    />
  );
}

describe("NdaForm", () => {
  it("renders fields for both parties and the shared terms", () => {
    render(<Wrapper onChange={() => {}} />);

    expect(screen.getAllByLabelText(/Company name/i)).toHaveLength(2);
    expect(screen.getByLabelText(/Purpose/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Effective date")).toBeInTheDocument();
    expect(screen.getByLabelText(/Governing law/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Jurisdiction/i)).toBeInTheDocument();
  });

  it("calls onChange with an updated party name when typed into", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Wrapper onChange={onChange} />);

    const [partyOneCompany] = screen.getAllByLabelText(/Company name/i);
    await user.type(partyOneCompany, "Acme");

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)?.[0] as NdaFormData;
    expect(lastCall.partyOne.companyName).toBe("Acme");
  });

  it("switches the MNDA term to until_terminated when that radio is selected", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Wrapper onChange={onChange} />);

    await user.click(screen.getByLabelText(/Continues until terminated/i));

    const lastCall = onChange.mock.calls.at(-1)?.[0] as NdaFormData;
    expect(lastCall.mndaTerm).toEqual({ type: "until_terminated" });
  });

  it("lets the user clear and retype the MNDA term years without concatenating digits", async () => {
    // Regression test: a plain controlled number input that falls back to 1
    // on every empty keystroke causes backspace-then-type to append onto
    // the forced "1" (e.g. typing "3" over a cleared "1" produces "13").
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { container } = render(<Wrapper onChange={onChange} />);

    const yearsInput = container.querySelector<HTMLInputElement>("#mnda-term-years")!;
    expect(yearsInput.value).toBe("1");

    await user.clear(yearsInput);
    await user.type(yearsInput, "3");

    const lastCall = onChange.mock.calls.at(-1)?.[0] as NdaFormData;
    expect(lastCall.mndaTerm).toEqual({ type: "expires", years: 3 });
  });

  it("falls back to 1 year on blur if the years field is left empty", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { container } = render(<Wrapper onChange={onChange} />);

    const yearsInput = container.querySelector<HTMLInputElement>("#mnda-term-years")!;
    await user.clear(yearsInput);
    await user.tab();

    expect(yearsInput.value).toBe("1");
    const lastCall = onChange.mock.calls.at(-1)?.[0] as NdaFormData;
    expect(lastCall.mndaTerm).toEqual({ type: "expires", years: 1 });
  });
});
