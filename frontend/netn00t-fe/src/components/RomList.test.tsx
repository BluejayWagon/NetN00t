import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RomList from "./RomList";

const sampleSummaries = [
  { name: "Street Fighter", fileName: "sf.bin", imageUrl: "/images/sf.png" },
  { name: "Marvel vs Capcom", fileName: "mvc.bin", imageUrl: "/images/mvc.png" },
];

test("shows loading text when hasFetched is false", () => {
  render(
    <RomList summaries={[]} hasFetched={false} selectedFileName="" onSelect={jest.fn()} />
  );
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test("shows empty state alert when fetched but no summaries", () => {
  render(
    <RomList summaries={[]} hasFetched={true} selectedFileName="" onSelect={jest.fn()} />
  );
  expect(screen.getByText(/no files found/i)).toBeInTheDocument();
});

test("renders a card for each ROM summary", () => {
  render(
    <RomList
      summaries={sampleSummaries}
      hasFetched={true}
      selectedFileName=""
      onSelect={jest.fn()}
    />
  );
  expect(screen.getByText("Street Fighter")).toBeInTheDocument();
  expect(screen.getByText("Marvel vs Capcom")).toBeInTheDocument();
});

test("calls onSelect with the correct fileName when a card is clicked", async () => {
  const onSelect = jest.fn();
  render(
    <RomList
      summaries={sampleSummaries}
      hasFetched={true}
      selectedFileName=""
      onSelect={onSelect}
    />
  );

  await userEvent.click(screen.getByText("Street Fighter"));
  expect(onSelect).toHaveBeenCalledWith("sf.bin");
});

test("renders images with correct src and alt", () => {
  render(
    <RomList
      summaries={sampleSummaries}
      hasFetched={true}
      selectedFileName=""
      onSelect={jest.fn()}
    />
  );
  const img = screen.getByAltText("Street Fighter") as HTMLImageElement;
  expect(img).toBeInTheDocument();
  expect(img.src).toContain("/images/sf.png");
});
