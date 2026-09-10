
import React, { useEffect, useState } from 'react';
import { User, Course, Certificate, CertificateTemplate } from '../types';
import { Download, RotateCcw, Award, Layout, Eye, X } from 'lucide-react';
import { OrgCertificatePreview, parseAssignedTemplateDisplay } from './OrgCertificatePreview';
import { getAccessToken } from '../utils/auth';
import {
  assignCertificateTemplate,
  getAssignedTemplateForCourse,
  downloadAssignedTemplatePreview,
  getCertificateDownloadById,
  getLatestCertificateDownload,
  getMyAssignedTemplate,
  issueCertificateToLearner,
} from '../api/certificates';

interface CertificateManagementProps {
  users: User[];
  courses: Course[];
  certificates: Certificate[];
}

import { getApiV1BaseUrl } from "@/lib/apiConfig";

const API_BASE = getApiV1BaseUrl();

export const CertificateManagement: React.FC<CertificateManagementProps> = ({ users, courses, certificates }) => {
  const [activeTab, setActiveTab] = useState<'issued' | 'templates'>('issued');
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [courseMappings, setCourseMappings] = useState<Record<string, string>>({});
  const [assigningCourseId, setAssigningCourseId] = useState<string | null>(null);
  const [downloadingLatest, setDownloadingLatest] = useState(false);
  const [fetchedCourses, setFetchedCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [fetchedUsers, setFetchedUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [myAssignedTemplate, setMyAssignedTemplate] = useState<CertificateTemplate | null>(null);
  const [orgTemplateStatus, setOrgTemplateStatus] = useState<'loading' | 'assigned' | 'none'>('loading');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [selectedIssueUserId, setSelectedIssueUserId] = useState('');
  const [selectedIssueCourseId, setSelectedIssueCourseId] = useState('');
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [localCertificates, setLocalCertificates] = useState<Certificate[]>(certificates);

  const normalizedCourses = courses.map((course: any) => ({
    id: course.id,
    title: course.title,
    description: course.description ?? "",
    status: course.status,
    category:
      typeof course.category === "string"
        ? course.category
        : course.category?.name ?? "",
    certificateTemplateId:
      course.certificateTemplateId ?? course.certificateTemplate?.id ?? null,
  }));

  const availableCourses =
    normalizedCourses.length > 0 ? normalizedCourses : fetchedCourses;
  const availableUsers = users.length > 0 ? users : fetchedUsers;
  const availableCourseIdsKey = availableCourses.map((course) => course.id).join("|");
  const assignableTemplates = myAssignedTemplate ? [myAssignedTemplate] : templates;

  const data = localCertificates.map(cert => ({
      ...cert,
      userName: availableUsers.find(u => u.id === cert.userId)?.name,
      courseTitle: availableCourses.find(c => c.id === cert.courseId)?.title,
  }));

  useEffect(() => {
    console.log("Certificates props response:", {
      certificates,
      users,
      courses,
    });
    console.log("Issued certificates resolved data:", data);
  }, [certificates, users, courses]);

  useEffect(() => {
    setLocalCertificates(certificates);
  }, [certificates]);

  useEffect(() => {
    if (users.length > 0) return;

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const token = getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const res = await fetch(`${API_BASE}/users/organization/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch users");

        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : payload?.data ?? [];
        const mapped: User[] = list.map((user: any) => ({
          id: user.id,
          name: user.fullName ?? user.name ?? "User",
          email: user.email ?? "",
          role: user.userRole ?? user.role,
          department: user.department ?? "",
          avatarUrl:
            user.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.fullName ?? user.name ?? "User",
            )}&background=random`,
        }));
        setFetchedUsers(mapped);
        console.log("Certificates fallback users response:", mapped);
      } catch (err) {
        console.error("Certificates fallback user fetch error:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [users.length]);

  useEffect(() => {
    const fetchAssignedTemplate = async () => {
      try {
        const assigned = await getMyAssignedTemplate();
        console.log("GET /api/v1/certificates/my-assigned-template response:", assigned);

        const tpl = assigned?.template ?? assigned;
        if (!tpl?.id) {
          setOrgTemplateStatus("none");
          return;
        }

        const httpUrl = (value?: string) =>
          typeof value === "string" && /^https?:\/\//i.test(value.trim())
            ? value.trim()
            : "";

        const display = parseAssignedTemplateDisplay(tpl);
        const logoUrl =
          httpUrl(tpl.previewUrl) ||
          httpUrl(tpl.url) ||
          httpUrl(tpl.blobUrl);

        const mappedTemplate: CertificateTemplate = {
          id: tpl.id,
          name: display.title || tpl.filename || "Organization template",
          previewUrl: logoUrl,
          uploadDate: tpl.createdAt
            ? new Date(tpl.createdAt).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          description: display.description,
          templateUrl: logoUrl,
          title: display.title,
          theme: display.theme,
          signatory: display.signatory,
          signatoryRole: display.signatoryRole,
          signatory2: display.signatory2,
          signatoryRole2: display.signatoryRole2,
          signatorySignatureUrl:
            display.signatorySignatureUrl || httpUrl(tpl.signatorySignatureUrl),
          signatory2SignatureUrl:
            display.signatory2SignatureUrl || httpUrl(tpl.signatory2SignatureUrl),
        };

        setMyAssignedTemplate(mappedTemplate);
        setOrgTemplateStatus("assigned");
        setTemplates((prev) => {
          const exists = prev.some((template) => template.id === mappedTemplate.id);
          if (exists) return prev;
          return [mappedTemplate, ...prev];
        });
      } catch (err) {
        // 404 is expected when HR has no template yet.
        console.warn("No assigned HR template yet:", err);
        setMyAssignedTemplate(null);
        setOrgTemplateStatus("none");
      }
    };

    fetchAssignedTemplate();
  }, []);

  useEffect(() => {
    if (normalizedCourses.length > 0) return;

    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const token = getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const res = await fetch(`${API_BASE}/courses`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch courses");

        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : payload?.data ?? [];
        const mapped: Course[] = list.map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description ?? "",
          status: course.status ?? "",
          category:
            typeof course.category === "string"
              ? course.category
              : course.category?.name ?? "",
          certificateTemplateId:
            course.certificateTemplateId ?? course.certificateTemplate?.id ?? null,
        }));
        setFetchedCourses(mapped);
        console.log("Certificates fallback courses response:", mapped);
      } catch (err) {
        console.error("Certificates fallback course fetch error:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [normalizedCourses.length]);

  useEffect(() => {
    if (!availableCourses.length) return;

    const fetchCourseTemplateAssignments = async () => {
      const settled = await Promise.allSettled(
        availableCourses.map((course) =>
          getAssignedTemplateForCourse(course.id).then((res) => ({
            courseId: course.id,
            templateId: res?.templateId ?? res?.template?.id ?? "",
          })),
        ),
      );

      const mappings: Record<string, string> = {};
      availableCourses.forEach((course) => {
        if (course.certificateTemplateId) {
          mappings[course.id] = course.certificateTemplateId;
        }
      });
      settled.forEach((result) => {
        if (result.status === "fulfilled" && result.value.templateId) {
          mappings[result.value.courseId] = result.value.templateId;
        }
      });

      setCourseMappings(mappings);
    };

    fetchCourseTemplateAssignments();
  }, [availableCourseIdsKey]);

  const triggerBrowserDownload = (blob: Blob, filename: string) => {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const blob = await downloadAssignedTemplatePreview();
      triggerBrowserDownload(blob, "mecure-certificate-preview.pdf");
    } catch (err) {
      console.error("Organization certificate preview download error:", err);
      alert(err instanceof Error ? err.message : "Failed to download certificate preview");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePreviewTemplate = () => {
    if (!myAssignedTemplate) return;
    setPreviewOpen(true);
  };

  const handleDownloadLatest = async () => {
    try {
      setDownloadingLatest(true);
      const blob = await getLatestCertificateDownload();
      triggerBrowserDownload(blob, `latest-certificate-${Date.now()}.pdf`);
      console.log("GET /api/v1/certificates/latest/download success");
    } catch (err) {
      console.error("Latest certificate download error:", err);
      alert(err instanceof Error ? err.message : "Failed to download latest certificate");
    } finally {
      setDownloadingLatest(false);
    }
  };

  const handleDownloadById = async (certificateId: string) => {
    try {
      const blob = await getCertificateDownloadById(certificateId);
      triggerBrowserDownload(blob, `certificate-${certificateId}.pdf`);
      console.log("GET /api/v1/certificates/:id/download success:", certificateId);
    } catch (err) {
      console.error("Certificate download by id error:", err);
      alert(err instanceof Error ? err.message : "Failed to download certificate");
    }
  };

  const handleAssignTemplateToCourse = async (
    courseId: string,
    templateId: string,
  ) => {
    const previousTemplateId = courseMappings[courseId] ?? "";

    if (!templateId) {
      setCourseMappings((prev) => ({ ...prev, [courseId]: templateId }));
      return;
    }

    const selectedTemplate = templates.find((template) => template.id === templateId);
    if (!selectedTemplate) {
      alert("Please select your assigned backend template.");
      setCourseMappings((prev) => ({ ...prev, [courseId]: previousTemplateId }));
      return;
    }

    if (myAssignedTemplate && templateId !== myAssignedTemplate.id) {
      alert("You can only assign your allocated certificate template.");
      setCourseMappings((prev) => ({ ...prev, [courseId]: previousTemplateId }));
      return;
    }

    setCourseMappings((prev) => ({ ...prev, [courseId]: templateId }));

    try {
      setAssigningCourseId(courseId);
      const res = await assignCertificateTemplate(courseId, templateId);
      console.log("POST /api/v1/certificates/assign-template response:", res);
      const successMessage =
        res?.message ?? "Template assigned to course successfully";
      alert(successMessage);
    } catch (err) {
      // Keep UI and backend in sync by rolling back selection on failure.
      setCourseMappings((prev) => ({ ...prev, [courseId]: previousTemplateId }));
      console.error("Assign template error:", err);
      alert(err instanceof Error ? err.message : "Failed to assign template");
    } finally {
      setAssigningCourseId(null);
    }
  };

  const handleIssueCertificate = async () => {
    if (!selectedIssueUserId || !selectedIssueCourseId) {
      alert("Please select learner and course.");
      return;
    }

    try {
      setIssuingCertificate(true);
      const issued = await issueCertificateToLearner(
        selectedIssueUserId,
        selectedIssueCourseId,
      );
      console.log("POST /api/v1/certificates/issue response:", issued);

      const normalized: Certificate = {
        id: issued?.id ?? `cert-${Date.now()}`,
        userId: issued?.userId ?? selectedIssueUserId,
        courseId: issued?.courseId ?? selectedIssueCourseId,
        issueDate:
          issued?.issuedAt ??
          issued?.issueDate ??
          new Date().toISOString(),
        certificateUrl: issued?.pdfPath ?? issued?.certificateUrl ?? "",
      };

      setLocalCertificates((prev) => [normalized, ...prev]);
      setSelectedIssueUserId("");
      setSelectedIssueCourseId("");
      alert("Certificate issued successfully.");
    } catch (err) {
      console.error("Issue certificate error:", err);
      alert(err instanceof Error ? err.message : "Failed to issue certificate");
    } finally {
      setIssuingCertificate(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
        {/* Tabs Header */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('issued')}
                className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'issued' ? 'border-brand-primary text-brand-primary bg-brand-primary/10/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Award className="w-4 h-4" /> Issued Certificates
            </button>
            <button 
                onClick={() => setActiveTab('templates')}
                className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'templates' ? 'border-brand-primary text-brand-primary bg-brand-primary/10/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Layout className="w-4 h-4" /> Certificate Templates
            </button>
        </div>

        {/* Content */}
        <div className="p-0">
            {activeTab === 'issued' ? (
                <div className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full lg:max-w-3xl">
                        <select
                          value={selectedIssueUserId}
                          onChange={(e) => setSelectedIssueUserId(e.target.value)}
                          className="border border-slate-300 rounded px-3 py-2 text-sm text-slate-700"
                          disabled={loadingUsers}
                        >
                          <option value="">
                            {loadingUsers ? "Loading learners..." : "-- Select learner --"}
                          </option>
                          {availableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={selectedIssueCourseId}
                          onChange={(e) => setSelectedIssueCourseId(e.target.value)}
                          className="border border-slate-300 rounded px-3 py-2 text-sm text-slate-700"
                          disabled={loadingCourses}
                        >
                          <option value="">
                            {loadingCourses ? "Loading courses..." : "-- Select course --"}
                          </option>
                          {availableCourses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleIssueCertificate}
                          disabled={issuingCertificate}
                          className="bg-slate-900 text-white rounded px-3 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
                        >
                          {issuingCertificate ? "Issuing..." : "Issue Certificate"}
                        </button>
                      </div>

                      <button
                        onClick={handleDownloadLatest}
                        disabled={downloadingLatest}
                        className="text-slate-600 hover:text-brand-primary flex items-center gap-1 text-xs font-medium border border-slate-200 rounded px-3 py-2 disabled:opacity-60"
                      >
                        <Download className="w-3 h-3" />
                        {downloadingLatest ? "Downloading..." : "Download Latest Certificate"}
                      </button>
                    </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3">Learner</th>
                            <th className="px-6 py-3">Course</th>
                            <th className="px-6 py-3">Issue Date</th>
                            <th className="px-6 py-3">Expiry</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {data.map((cert) => (
                            <tr key={cert.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3 font-medium text-slate-900">{cert.userName}</td>
                            <td className="px-6 py-3 text-slate-700">{cert.courseTitle}</td>
                            <td className="px-6 py-3 text-slate-500">{cert.issueDate}</td>
                            <td className="px-6 py-3 text-slate-500">{cert.expiryDate || 'N/A'}</td>
                            <td className="px-6 py-3 text-right">
                                <div className="flex justify-end gap-3">
                                    <button
                                      onClick={() =>
                                        cert.certificateUrl
                                          ? window.open(cert.certificateUrl, "_blank")
                                          : handleDownloadById(cert.id)
                                      }
                                      className="text-slate-500 hover:text-brand-primary flex items-center gap-1 text-xs font-medium border border-slate-200 rounded px-2 py-1"
                                    >
                                        <Download className="w-3 h-3" /> Download
                                    </button>
                                    <button
                                      onClick={() => handleDownloadById(cert.id)}
                                      className="text-slate-500 hover:text-brand-primary flex items-center gap-1 text-xs font-medium border border-slate-200 rounded px-2 py-1"
                                    >
                                        <Download className="w-3 h-3" /> Download by ID
                                    </button>
                                    <button className="text-slate-500 hover:text-orange-600 flex items-center gap-1 text-xs font-medium border border-slate-200 rounded px-2 py-1">
                                        <RotateCcw className="w-3 h-3" /> Reissue
                                    </button>
                                </div>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                </div>
            ) : (
                <div className="p-6 space-y-8">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <h3 className="text-lg font-bold text-slate-900">Organization template</h3>
                        </div>

                        {orgTemplateStatus === "loading" && (
                          <div className="border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                            Loading organization template...
                          </div>
                        )}

                        {orgTemplateStatus === "none" && (
                          <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50 p-8 text-center">
                            <p className="text-sm font-medium text-slate-700">
                              No certificate template assigned to your organization.
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              Ask a Super Admin to assign a certificate template to your organization.
                            </p>
                          </div>
                        )}

                        {orgTemplateStatus === "assigned" && myAssignedTemplate && (
                          <div className="max-w-[780px] border border-brand-primary/20 rounded-xl overflow-hidden bg-white shadow-sm">
                            <OrgCertificatePreview template={myAssignedTemplate} compact />
                            <div className="p-5 space-y-3 border-t border-slate-100">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
                                    Organization template
                                  </p>
                                  <h4 className="font-semibold text-slate-900 mt-1">{myAssignedTemplate.name}</h4>
                                </div>
                              </div>
                              {myAssignedTemplate.description && (
                                <p className="text-sm text-slate-600">{myAssignedTemplate.description}</p>
                              )}
                              <p className="text-xs text-slate-500">Assigned: {myAssignedTemplate.uploadDate}</p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handlePreviewTemplate}
                                  className="text-slate-600 hover:text-brand-primary flex items-center gap-1 text-xs font-medium border border-slate-200 rounded px-3 py-2"
                                >
                                  <Eye className="w-3 h-3" /> Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDownloadTemplate}
                                  disabled={downloadingTemplate}
                                  className="text-slate-600 hover:text-brand-primary flex items-center gap-1 text-xs font-medium border border-slate-200 rounded px-3 py-2 disabled:opacity-60"
                                >
                                  <Download className="w-3 h-3" />
                                  {downloadingTemplate ? "Downloading..." : "Download"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Course Mapping Table */}
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">Assign Templates to Courses</h3>
                        <div className="overflow-hidden border border-slate-200 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">Course Title</th>
                                        <th className="px-6 py-3">Category</th>
                                        <th className="px-6 py-3">Selected Template</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {availableCourses.map(course => (
                                        <tr key={course.id}>
                                            <td className="px-6 py-3 font-medium text-slate-900">{course.title}</td>
                                            <td className="px-6 py-3 text-slate-500">{course.category || "-"}</td>
                                            <td className="px-6 py-3">
                                                <div className="relative w-64">
                                                    <select 
                                                        className="w-full border border-slate-300 rounded px-3 py-2 text-slate-700 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                                                        value={courseMappings[course.id] || ''}
                                                        disabled={assignableTemplates.length === 0}
                                                        onChange={(e) =>
                                                          handleAssignTemplateToCourse(
                                                            course.id,
                                                            e.target.value,
                                                          )
                                                        }
                                                    >
                                                        <option value="">
                                                          {assignableTemplates.length === 0
                                                            ? "-- No assigned template --"
                                                            : "-- Select template --"}
                                                        </option>
                                                        {assignableTemplates.map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                    {assigningCourseId === course.id && (
                                                      <p className="mt-1 text-[11px] text-brand-primary">Assigning...</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {loadingCourses && (
                              <p className="p-3 text-xs text-slate-500">Loading courses...</p>
                            )}
                            {!loadingCourses && availableCourses.length === 0 && (
                              <p className="p-3 text-xs text-amber-700">
                                No courses found yet. Create/publish courses first, then assign a template.
                              </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        {previewOpen && myAssignedTemplate && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-[820px] w-full overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <h4 className="text-sm font-semibold text-slate-900">
                  {myAssignedTemplate.name}
                </h4>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-slate-100 p-4 max-h-[75vh] overflow-auto">
                <div className="w-[760px] max-w-full mx-auto border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <OrgCertificatePreview template={myAssignedTemplate} />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
                {myAssignedTemplate.previewUrl && (
                  <a
                    href={myAssignedTemplate.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-slate-600 border border-slate-200 rounded px-3 py-2 hover:text-brand-primary"
                  >
                    Open logo
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="text-xs font-medium text-white bg-slate-900 rounded px-3 py-2 disabled:opacity-60"
                >
                  {downloadingTemplate ? "Downloading..." : "Download"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
