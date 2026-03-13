import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePanel from "./ProfilePanel";

const profiles = [
  {
    id: "p1",
    name: "Cabinet 1",
    boardType: "Naomi 1",
    monitorOrientation: "Horizontal/Yoko",
    ip: "192.168.1.1",
  },
  {
    id: "p2",
    name: "Cabinet 2",
    boardType: "Naomi 2",
    monitorOrientation: "Vertical/Tate",
    ip: "192.168.1.2",
  },
];

const defaultProps = {
  profiles,
  selectedProfileId: "",
  selectedProfile: null,
  onProfileChange: jest.fn(),
  onNewProfile: jest.fn(),
  onEditProfile: jest.fn(),
  onDeleteProfile: jest.fn(),
};

beforeEach(() => {
  // Suppress MUI's "anchorEl is invalid" warning, which fires in JSDOM because
  // it has no layout engine and MUI's Popover cannot measure element positions.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("renders the New Profile button", () => {
  render(<ProfilePanel {...defaultProps} />);
  expect(screen.getByRole("button", { name: /new profile/i })).toBeInTheDocument();
});

test("does not show Edit or Delete buttons when no profile is selected", () => {
  render(<ProfilePanel {...defaultProps} />);
  expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
});

test("shows Edit and Delete buttons when a profile is selected", () => {
  render(
    <ProfilePanel
      {...defaultProps}
      selectedProfileId="p1"
      selectedProfile={profiles[0]}
    />
  );
  expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
});

test("shows selected profile details in the info alert", () => {
  render(
    <ProfilePanel
      {...defaultProps}
      selectedProfileId="p1"
      selectedProfile={profiles[0]}
    />
  );
  expect(screen.getByText(/192\.168\.1\.1/)).toBeInTheDocument();
  expect(screen.getByText(/Naomi 1/)).toBeInTheDocument();
  expect(screen.getByText(/Horizontal\/Yoko/)).toBeInTheDocument();
});

test("does not show profile info alert when no profile selected", () => {
  render(<ProfilePanel {...defaultProps} />);
  expect(screen.queryByText(/192\.168/)).not.toBeInTheDocument();
});

test("calls onNewProfile when New Profile button is clicked", async () => {
  const onNewProfile = jest.fn();
  render(<ProfilePanel {...defaultProps} onNewProfile={onNewProfile} />);
  await act(async () => {
    userEvent.click(screen.getByRole("button", { name: /new profile/i }));
  });
  expect(onNewProfile).toHaveBeenCalledTimes(1);
});

test("calls onEditProfile with the selected profile when Edit is clicked", async () => {
  const onEditProfile = jest.fn();
  render(
    <ProfilePanel
      {...defaultProps}
      selectedProfileId="p1"
      selectedProfile={profiles[0]}
      onEditProfile={onEditProfile}
    />
  );
  await act(async () => {
    userEvent.click(screen.getByRole("button", { name: /edit/i }));
  });
  expect(onEditProfile).toHaveBeenCalledWith(profiles[0]);
});

test("calls onDeleteProfile with the selected profile id when Delete is clicked", async () => {
  const onDeleteProfile = jest.fn();
  render(
    <ProfilePanel
      {...defaultProps}
      selectedProfileId="p1"
      selectedProfile={profiles[0]}
      onDeleteProfile={onDeleteProfile}
    />
  );
  await act(async () => {
    userEvent.click(screen.getByRole("button", { name: /delete/i }));
  });
  expect(onDeleteProfile).toHaveBeenCalledWith("p1");
});

test("renders all profiles in the dropdown when opened", async () => {
  render(<ProfilePanel {...defaultProps} />);
  // MUI Select options are only rendered in the DOM after the combobox is opened
  await act(async () => {
    userEvent.click(screen.getByRole("combobox"));
  });
  expect(screen.getByText("Cabinet 1")).toBeInTheDocument();
  expect(screen.getByText("Cabinet 2")).toBeInTheDocument();
});
