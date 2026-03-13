import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RomDetails from "./RomDetails";

const detail = {
  Name: "Street Fighter",
  PictureName: "sf.png",
  FileName: "sf.bin",
  BoardType: "Naomi 1",
  FullPath: "/roms/sf.bin",
  Genre: "Fighting",
  Tate: false,
  Description: "Classic fighting game.",
};

const profile = {
  id: "p1",
  name: "Cabinet 1",
  boardType: "Naomi 1",
  monitorOrientation: "Horizontal/Yoko",
  ip: "192.168.1.100",
};

test("shows placeholder when no ROM is selected", () => {
  render(
    <RomDetails
      selectedDetail={null}
      selectedFileName=""
      selectedProfile={null}
      onUpload={jest.fn()}
    />
  );
  expect(screen.getByText(/select a rom/i)).toBeInTheDocument();
});

test("renders ROM name and board type", () => {
  render(
    <RomDetails
      selectedDetail={detail}
      selectedFileName="sf.bin"
      selectedProfile={profile}
      onUpload={jest.fn()}
    />
  );
  expect(screen.getByText("Street Fighter")).toBeInTheDocument();
  expect(screen.getByText(/Naomi 1/)).toBeInTheDocument();
});

test("renders genre when present", () => {
  render(
    <RomDetails
      selectedDetail={detail}
      selectedFileName="sf.bin"
      selectedProfile={profile}
      onUpload={jest.fn()}
    />
  );
  expect(screen.getByText(/Fighting/)).toBeInTheDocument();
});

test("renders description when present", () => {
  render(
    <RomDetails
      selectedDetail={detail}
      selectedFileName="sf.bin"
      selectedProfile={profile}
      onUpload={jest.fn()}
    />
  );
  expect(screen.getByText(/Classic fighting game/)).toBeInTheDocument();
});

test("shows Horizontal orientation when Tate is false", () => {
  render(
    <RomDetails
      selectedDetail={{ ...detail, Tate: false }}
      selectedFileName="sf.bin"
      selectedProfile={profile}
      onUpload={jest.fn()}
    />
  );
  expect(screen.getByText(/Horizontal/)).toBeInTheDocument();
});

test("shows Vertical/TATE orientation when Tate is true", () => {
  render(
    <RomDetails
      selectedDetail={{ ...detail, Tate: true }}
      selectedFileName="sf.bin"
      selectedProfile={profile}
      onUpload={jest.fn()}
    />
  );
  expect(screen.getByText(/Vertical\/TATE/)).toBeInTheDocument();
});

test("upload button is disabled and shows prompt when no profile selected", () => {
  render(
    <RomDetails
      selectedDetail={detail}
      selectedFileName="sf.bin"
      selectedProfile={null}
      onUpload={jest.fn()}
    />
  );
  const btn = screen.getByRole("button", { name: /select a profile/i });
  expect(btn).toBeDisabled();
});

test("upload button shows profile name and is enabled when profile selected", () => {
  render(
    <RomDetails
      selectedDetail={detail}
      selectedFileName="sf.bin"
      selectedProfile={profile}
      onUpload={jest.fn()}
    />
  );
  const btn = screen.getByRole("button", { name: /upload to cabinet 1/i });
  expect(btn).toBeEnabled();
});

test("calls onUpload when upload button is clicked", async () => {
  const onUpload = jest.fn();
  render(
    <RomDetails
      selectedDetail={detail}
      selectedFileName="sf.bin"
      selectedProfile={profile}
      onUpload={onUpload}
    />
  );
  await act(async () => {
    userEvent.click(screen.getByRole("button", { name: /upload to cabinet 1/i }));
  });
  expect(onUpload).toHaveBeenCalledTimes(1);
});

test("does not render genre section when genre is absent", () => {
  const noGenre = { ...detail, Genre: undefined };
  render(
    <RomDetails
      selectedDetail={noGenre}
      selectedFileName="sf.bin"
      selectedProfile={profile}
      onUpload={jest.fn()}
    />
  );
  expect(screen.queryByText(/Genre:/)).not.toBeInTheDocument();
});
