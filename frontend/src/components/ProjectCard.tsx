import { BriefcaseBusiness, FolderKanban } from "lucide-react";
import { getProjectAvatar } from "../utils/avatar";

export type ProjectStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED";

export type Project = {
  id: number;
  name: string;
  status: ProjectStatus;
  is_internal: boolean;
};

type ProjectCardProps = {
  project: Project;
  className?: string;
};

type StatusMeta = {
  label: string;
  className: string;
};

const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  NOT_STARTED: {
    label: "Not Started",
    className: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200",
  },
  ON_HOLD: {
    label: "On Hold",
    className: "bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  },
};

const ProjectCard = ({ project, className = "" }: ProjectCardProps) => {
  const avatar = getProjectAvatar(project.name);
  const status = STATUS_META[project.status];
  const typeLabel = project.is_internal ? "Internal" : "Client";

  return (
    <article
      className={`w-full rounded-lg bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${avatar.bgClass} ${avatar.textClass}`}
          aria-hidden="true"
        >
          {avatar.label ? (
            <span className="text-lg font-semibold leading-none">{avatar.label}</span>
          ) : (
            <FolderKanban className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
              {project.name || "Untitled Project"}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
            >
              {status.label}
            </span>
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            <span>{typeLabel}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;
