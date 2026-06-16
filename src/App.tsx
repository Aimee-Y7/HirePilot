import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Database,
  Edit3,
  Eye,
  FileText,
  Filter,
  KeyRound,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UploadCloud,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react'
import './App.css'

type Role = 'candidate' | 'recruiter' | 'admin'
type JobStatus = 'open' | 'paused' | 'closed'

type User = {
  id: string
  name: string
  email: string
  role: Role
  status?: 'active' | 'disabled'
  candidateId?: string
}

type Job = {
  id: string
  title: string
  department: string
  location: string
  type: string
  level: string
  salary: string
  owner: string
  summary: string
  skills: string[]
  posted: string
  applicants: number
  stage: string
  status: JobStatus
}

type Candidate = {
  id: string
  userId?: string
  name: string
  title: string
  location: string
  experience: string
  skills: string[]
  resume: string
  resumeHighlights: string
  resumeFile: string
  status: string
  source: string
  notes: string
}

type CandidateWithScore = Candidate & {
  score: number
  matchedSkills: string[]
}

type Application = {
  id: string
  jobId: string
  candidateId: string
  status: string
  note: string
  createdAt: string
}

type JobForm = {
  title: string
  department: string
  location: string
  type: string
  level: string
  salary: string
  skills: string
  summary: string
  status: JobStatus
}

type AuthForm = {
  name: string
  email: string
  password: string
  role: Role
}

type BootstrapResponse = {
  jobs: Job[]
  candidates: Candidate[]
  applications: Application[]
}

type AdminOverview = BootstrapResponse & {
  users: User[]
  metrics: {
    users: number
    activeUsers: number
    jobs: number
    openJobs: number
    candidates: number
    applications: number
  }
}

type AuthResponse = {
  token: string
  user: User
}

type MeResponse = {
  user: User
  candidate: Candidate | null
}

const skillDictionary = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'SQL',
  '数据分析',
  '产品设计',
  '用户研究',
  '招聘',
  '薪酬',
  '绩效',
  'HRBP',
  '销售',
  'SaaS',
  'AI',
  'NLP',
  '运营',
  '项目管理',
]

const defaultJobForm: JobForm = {
  title: '',
  department: '产品',
  location: '上海',
  type: '全职',
  level: '3-5 年',
  salary: '',
  skills: '',
  summary: '',
  status: 'open',
}

const defaultAuthForm: AuthForm = {
  name: '',
  email: 'candidate@demo.com',
  password: 'demo123',
  role: 'candidate',
}

function parseSkills(input: string) {
  return input
    .split(/[,，、\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean)
}

function extractSkills(text: string) {
  const normalizedText = text.toLowerCase()

  return skillDictionary.filter((skill) =>
    normalizedText.includes(skill.toLowerCase()),
  )
}

function uniqSkills(skills: string[]) {
  return Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)))
}

function scoreMatch(candidateSkills: string[], job: Job, resumeText = '') {
  const requiredSkills = job.skills.length > 0 ? job.skills : ['通用能力']
  const matchedSkills = requiredSkills.filter((skill) =>
    candidateSkills.some(
      (candidateSkill) =>
        candidateSkill.toLowerCase() === skill.toLowerCase() ||
        candidateSkill.toLowerCase().includes(skill.toLowerCase()),
    ),
  )
  const skillScore = Math.round(
    (matchedSkills.length / requiredSkills.length) * 72,
  )
  const textBonus = requiredSkills.reduce((total, skill) => {
    return resumeText.toLowerCase().includes(skill.toLowerCase())
      ? total + 4
      : total
  }, 0)
  const coverageBonus = candidateSkills.length >= 5 ? 12 : 6

  return {
    score: Math.min(99, skillScore + textBonus + coverageBonus),
    matchedSkills,
  }
}

function statusLabel(status: JobStatus) {
  return {
    open: '招聘中',
    paused: '已暂停',
    closed: '已关闭',
  }[status]
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('hirepilot-token') ?? '',
  )
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [candidateProfile, setCandidateProfile] = useState<Candidate | null>(
    null,
  )
  const [activeRole, setActiveRole] = useState<Role>('candidate')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState(defaultAuthForm)
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null)
  const [screenedCandidates, setScreenedCandidates] = useState<
    CandidateWithScore[]
  >([])
  const [resumeHighlights, setResumeHighlights] = useState('')
  const [targetJobId, setTargetJobId] = useState('')
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('全部城市')
  const [departmentFilter, setDepartmentFilter] = useState('全部部门')
  const [skillFilter, setSkillFilter] = useState('全部技能')
  const [jobForm, setJobForm] = useState(defaultJobForm)
  const [editingJobId, setEditingJobId] = useState('')
  const [screeningJobId, setScreeningJobId] = useState('')
  const [minScore, setMinScore] = useState(70)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [candidateNotes, setCandidateNotes] = useState('')
  const [candidateStatus, setCandidateStatus] = useState('待筛选')
  const [applicationStatus, setApplicationStatus] = useState('已投递')
  const [applicationNote, setApplicationNote] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const request = useCallback(
    async <T,>(path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers)
      const body = options.body

      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }

      const response = await fetch(path, {
        ...options,
        headers,
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.message ?? '请求失败')
      }

      return data as T
    },
    [token],
  )

  const clearSession = useCallback(() => {
    localStorage.removeItem('hirepilot-token')
    setToken('')
    setCurrentUser(null)
    setCandidateProfile(null)
    setAdminOverview(null)
    setActiveRole('candidate')
  }, [])

  const loadBootstrap = useCallback(async () => {
    const data = await request<BootstrapResponse>('/api/bootstrap')
    setJobs(data.jobs)
    setCandidates(data.candidates)
    setApplications(data.applications)
  }, [request])

  const loadMe = useCallback(async () => {
    try {
      const data = await request<MeResponse>('/api/me')
      setCurrentUser(data.user)
      setCandidateProfile(data.candidate)
      setResumeHighlights(data.candidate?.resumeHighlights ?? '')
      setActiveRole(data.user.role)
    } catch {
      clearSession()
    }
  }, [clearSession, request])

  const currentRole = currentUser?.role

  const loadScreeningCandidates = useCallback(async () => {
    if (
      !screeningJobId ||
      !currentRole ||
      !['recruiter', 'admin'].includes(currentRole)
    ) {
      return
    }

    const params = new URLSearchParams({
      jobId: screeningJobId,
      minScore: String(minScore),
      search: candidateSearch,
    })
    const data = await request<{ candidates: CandidateWithScore[] }>(
      `/api/candidates?${params.toString()}`,
    )
    setScreenedCandidates(data.candidates)
  }, [candidateSearch, currentRole, minScore, request, screeningJobId])

  const loadAdminOverview = useCallback(async () => {
    if (currentRole !== 'admin') {
      return
    }

    const data = await request<AdminOverview>('/api/admin/overview')
    setAdminOverview(data)
  }, [currentRole, request])

  useEffect(() => {
    void loadBootstrap().catch((error) => setMessage(error.message))
  }, [loadBootstrap])

  useEffect(() => {
    if (token) {
      void loadMe()
    }
  }, [loadMe, token])

  useEffect(() => {
    if (jobs.length === 0) {
      return
    }

    if (!screeningJobId || !jobs.some((job) => job.id === screeningJobId)) {
      setScreeningJobId(jobs[0].id)
    }

    const openJob = jobs.find((job) => job.status === 'open') ?? jobs[0]

    if (!targetJobId || !jobs.some((job) => job.id === targetJobId)) {
      setTargetJobId(openJob.id)
    }
  }, [jobs, screeningJobId, targetJobId])

  useEffect(() => {
    void loadScreeningCandidates().catch((error) => setMessage(error.message))
  }, [loadScreeningCandidates])

  useEffect(() => {
    void loadAdminOverview().catch((error) => setMessage(error.message))
  }, [loadAdminOverview])

  const openJobs = useMemo(
    () => jobs.filter((job) => job.status === 'open'),
    [jobs],
  )
  const cities = useMemo(
    () => ['全部城市', ...Array.from(new Set(openJobs.map((job) => job.location)))],
    [openJobs],
  )
  const departments = useMemo(
    () => [
      '全部部门',
      ...Array.from(new Set(openJobs.map((job) => job.department))),
    ],
    [openJobs],
  )
  const allSkills = useMemo(
    () => [
      '全部技能',
      ...Array.from(new Set(openJobs.flatMap((job) => job.skills))),
    ],
    [openJobs],
  )
  const visibleJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return openJobs.filter((job) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [job.title, job.department, job.summary, job.location]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesLocation =
        locationFilter === '全部城市' || job.location === locationFilter
      const matchesDepartment =
        departmentFilter === '全部部门' || job.department === departmentFilter
      const matchesSkill =
        skillFilter === '全部技能' || job.skills.includes(skillFilter)

      return (
        matchesQuery && matchesLocation && matchesDepartment && matchesSkill
      )
    })
  }, [departmentFilter, locationFilter, openJobs, query, skillFilter])

  const selectedTargetJob =
    jobs.find((job) => job.id === targetJobId) ?? openJobs[0] ?? jobs[0]
  const currentCandidateSkills = uniqSkills([
    ...(candidateProfile?.skills ?? []),
    ...extractSkills(resumeHighlights),
  ])
  const candidateMatch = selectedTargetJob
    ? scoreMatch(
        currentCandidateSkills,
        selectedTargetJob,
        `${candidateProfile?.resume ?? ''} ${resumeHighlights}`,
      )
    : { score: 0, matchedSkills: [] }
  const selectedCandidate =
    screenedCandidates.find((candidate) => candidate.id === selectedCandidateId) ??
    candidates.find((candidate) => candidate.id === selectedCandidateId) ??
    null
  const selectedApplication = selectedCandidate
    ? applications.find(
        (application) =>
          application.candidateId === selectedCandidate.id &&
          application.jobId === screeningJobId,
      )
    : null
  const candidateApplications = candidateProfile
    ? applications.filter(
        (application) => application.candidateId === candidateProfile.id,
      )
    : []
  const averageScore =
    screenedCandidates.length > 0
      ? Math.round(
          screenedCandidates.reduce(
            (total, candidate) => total + candidate.score,
            0,
          ) / screenedCandidates.length,
        )
      : candidateMatch.score
  const pipelineCounts = {
    applied: applications.length,
    recommended: applications.filter((item) => item.status.includes('推荐'))
      .length,
    interview: applications.filter((item) => item.status.includes('面试'))
      .length,
    offer: applications.filter((item) => item.status.includes('Offer')).length,
  }

  async function refreshAll() {
    await loadBootstrap()
    await loadMe()
    await loadScreeningCandidates()
    await loadAdminOverview()
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      const path =
        authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload =
        authMode === 'login'
          ? {
              email: authForm.email,
              password: authForm.password,
            }
          : authForm
      const data = await request<AuthResponse>(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      localStorage.setItem('hirepilot-token', data.token)
      setToken(data.token)
      setCurrentUser(data.user)
      setActiveRole(data.user.role)
      setMessage('登录状态已更新')
      await loadBootstrap()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '登录失败')
    } finally {
      setIsBusy(false)
    }
  }

  async function loginDemo(role: Role) {
    const email =
      role === 'candidate'
        ? 'candidate@demo.com'
        : role === 'recruiter'
          ? 'recruiter@demo.com'
          : 'admin@demo.com'
    setAuthMode('login')
    setAuthForm((current) => ({
      ...current,
      email,
      password: 'demo123',
      role,
    }))
    setIsBusy(true)
    setMessage('')

    try {
      const data = await request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'demo123',
        }),
      })

      localStorage.setItem('hirepilot-token', data.token)
      setToken(data.token)
      setCurrentUser(data.user)
      setActiveRole(data.user.role)
      await loadBootstrap()
      const roleName =
        role === 'candidate' ? '求职者' : role === 'recruiter' ? '招聘方' : '后台'
      setMessage(`${roleName}演示账号已登录`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '登录失败')
    } finally {
      setIsBusy(false)
    }
  }

  async function saveCandidateProfile() {
    if (!candidateProfile) {
      return
    }

    setIsBusy(true)
    setMessage('')

    try {
      const data = await request<MeResponse>('/api/me/candidate', {
        method: 'PATCH',
        body: JSON.stringify({
          name: candidateProfile.name,
          title: candidateProfile.title,
          location: candidateProfile.location,
          experience: candidateProfile.experience,
          resumeHighlights,
        }),
      })

      setCurrentUser(data.user)
      setCandidateProfile(data.candidate)
      await loadBootstrap()
      setMessage('候选人档案已保存')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file || !candidateProfile) {
      return
    }

    const body = new FormData()
    body.append('resume', file)
    body.append('highlights', resumeHighlights)
    setIsBusy(true)
    setMessage('')

    try {
      const data = await request<{ candidate: Candidate; parser: string }>(
        '/api/resumes',
        {
          method: 'POST',
          body,
        },
      )

      setCandidateProfile(data.candidate)
      await loadBootstrap()
      setMessage(
        data.parser === 'document'
          ? '简历已解析并更新技能'
          : '简历已上传，请继续补充亮点',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '上传失败')
    } finally {
      setIsBusy(false)
      event.target.value = ''
    }
  }

  async function applyToJob(job: Job) {
    setIsBusy(true)
    setMessage('')

    try {
      const data = await request<{ application: Application }>(
        '/api/applications',
        {
          method: 'POST',
          body: JSON.stringify({ jobId: job.id }),
        },
      )
      setApplications((current) => {
        const exists = current.some(
          (application) => application.id === data.application.id,
        )

        return exists
          ? current.map((application) =>
              application.id === data.application.id
                ? data.application
                : application,
            )
          : [data.application, ...current]
      })
      await loadBootstrap()
      setTargetJobId(job.id)
      setMessage('投递记录已生成')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '投递失败')
    } finally {
      setIsBusy(false)
    }
  }

  async function submitJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      const payload = {
        ...jobForm,
        skills: parseSkills(jobForm.skills),
      }
      const path = editingJobId ? `/api/jobs/${editingJobId}` : '/api/jobs'
      const data = await request<{ job: Job }>(path, {
        method: editingJobId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })

      setJobs((current) => {
        const exists = current.some((job) => job.id === data.job.id)

        return exists
          ? current.map((job) => (job.id === data.job.id ? data.job : job))
          : [data.job, ...current]
      })
      setScreeningJobId(data.job.id)
      setTargetJobId(data.job.id)
      setMinScore(50)
      setJobForm(defaultJobForm)
      setEditingJobId('')
      await loadBootstrap()
      setMessage(editingJobId ? '岗位已更新' : '岗位已发布')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '岗位保存失败')
    } finally {
      setIsBusy(false)
    }
  }

  function editJob(job: Job) {
    setEditingJobId(job.id)
    setJobForm({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      level: job.level,
      salary: job.salary,
      skills: job.skills.join(', '),
      summary: job.summary,
      status: job.status,
    })
  }

  async function updateJobStatus(job: Job, status: JobStatus) {
    setIsBusy(true)
    setMessage('')

    try {
      const data = await request<{ job: Job }>(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setJobs((current) =>
        current.map((item) => (item.id === job.id ? data.job : item)),
      )
      await loadBootstrap()
      setMessage('岗位状态已更新')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '状态更新失败')
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteJob(job: Job) {
    setIsBusy(true)
    setMessage('')

    try {
      await request(`/api/jobs/${job.id}`, {
        method: 'DELETE',
      })
      setJobs((current) => current.filter((item) => item.id !== job.id))
      setApplications((current) =>
        current.filter((application) => application.jobId !== job.id),
      )
      await loadBootstrap()
      setMessage('岗位已删除')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '删除失败')
    } finally {
      setIsBusy(false)
    }
  }

  function openCandidateDetails(candidate: CandidateWithScore) {
    const application = applications.find(
      (item) =>
        item.candidateId === candidate.id && item.jobId === screeningJobId,
    )

    setSelectedCandidateId(candidate.id)
    setCandidateNotes(candidate.notes ?? '')
    setCandidateStatus(candidate.status)
    setApplicationStatus(application?.status ?? '已投递')
    setApplicationNote(application?.note ?? '')
  }

  async function saveCandidateDetails() {
    if (!selectedCandidate) {
      return
    }

    setIsBusy(true)
    setMessage('')

    try {
      const candidateData = await request<{ candidate: Candidate }>(
        `/api/candidates/${selectedCandidate.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: candidateStatus,
            notes: candidateNotes,
          }),
        },
      )

      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === candidateData.candidate.id
            ? candidateData.candidate
            : candidate,
        ),
      )

      if (selectedApplication) {
        const appData = await request<{ application: Application }>(
          `/api/applications/${selectedApplication.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              status: applicationStatus,
              note: applicationNote,
            }),
          },
        )
        setApplications((current) =>
          current.map((application) =>
            application.id === appData.application.id
              ? appData.application
              : application,
          ),
        )
      }

      await loadBootstrap()
      await loadScreeningCandidates()
      setMessage('候选人详情已保存')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsBusy(false)
    }
  }

  async function toggleCandidateSaved(candidate: CandidateWithScore) {
    const nextStatus = candidate.status === '已收藏' ? '待筛选' : '已收藏'
    setIsBusy(true)
    setMessage('')

    try {
      await request(`/api/candidates/${candidate.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      await loadBootstrap()
      await loadScreeningCandidates()
      setMessage(nextStatus === '已收藏' ? '候选人已收藏' : '已取消收藏')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败')
    } finally {
      setIsBusy(false)
    }
  }

  async function updateUser(user: User, payload: Partial<User>) {
    setIsBusy(true)
    setMessage('')

    try {
      const data = await request<{ user: User }>(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      setAdminOverview((current) =>
        current
          ? {
              ...current,
              users: current.users.map((item) =>
                item.id === data.user.id ? data.user : item,
              ),
            }
          : current,
      )
      await loadAdminOverview()
      setMessage('后台用户已更新')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '用户更新失败')
    } finally {
      setIsBusy(false)
    }
  }

  function updateJobForm(field: keyof JobForm, value: string) {
    setJobForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateCandidateProfile(field: keyof Candidate, value: string) {
    setCandidateProfile((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    )
  }

  const canSeeCandidate = currentUser?.role === 'candidate'
  const canSeeRecruiter = currentUser?.role === 'recruiter'
  const canSeeAdmin = currentUser?.role === 'admin'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup" aria-label="HirePilot AI">
          <span className="brand-mark">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">AI 招聘工作台</p>
            <h1>HirePilot AI</h1>
          </div>
        </div>
        <nav className="role-switch" aria-label="角色切换">
          <button
            className={activeRole === 'candidate' ? 'active' : ''}
            disabled={!canSeeCandidate}
            type="button"
            onClick={() => setActiveRole('candidate')}
          >
            <UserRound size={18} aria-hidden="true" />
            求职者
          </button>
          <button
            className={activeRole === 'recruiter' ? 'active' : ''}
            disabled={!canSeeRecruiter}
            type="button"
            onClick={() => setActiveRole('recruiter')}
          >
            <Building2 size={18} aria-hidden="true" />
            招聘方
          </button>
          <button
            className={activeRole === 'admin' ? 'active' : ''}
            disabled={!canSeeAdmin}
            type="button"
            onClick={() => setActiveRole('admin')}
          >
            <ShieldCheck size={18} aria-hidden="true" />
            后台
          </button>
        </nav>
        <div className="account-panel">
          {currentUser ? (
            <>
              <span className="account-name">
                <ShieldCheck size={16} aria-hidden="true" />
                {currentUser.name}
              </span>
              <button type="button" onClick={clearSession}>
                <LogOut size={17} aria-hidden="true" />
                退出
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => loginDemo('candidate')}>
                <UserRound size={17} aria-hidden="true" />
                求职演示
              </button>
              <button type="button" onClick={() => loginDemo('recruiter')}>
                <Building2 size={17} aria-hidden="true" />
                招聘演示
              </button>
              <button type="button" onClick={() => loginDemo('admin')}>
                <ShieldCheck size={17} aria-hidden="true" />
                后台演示
              </button>
            </>
          )}
        </div>
      </header>

      <main>
        {currentUser ? (
          <section className="summary-band" aria-label="招聘概览">
            <div className="metric">
              <span>活跃岗位</span>
              <strong>{openJobs.length}</strong>
            </div>
            <div className="metric">
              <span>候选人库</span>
              <strong>{candidates.length}</strong>
            </div>
            <div className="metric">
              <span>平均匹配</span>
              <strong>{averageScore}%</strong>
            </div>
            <div className="visual-tile">
              <img
                src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=900&q=80"
                alt="招聘团队在工作台上协作分析候选人数据"
              />
              <div>
                <span>今日推荐</span>
                <strong>
                  {screenedCandidates[0]?.name ??
                    candidateProfile?.name ??
                    currentUser.name}
                </strong>
              </div>
            </div>
          </section>
        ) : null}

        {message ? (
          <div className="status-banner" role="status">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {!currentUser ? (
          <section className="auth-workspace" aria-label="账号登录">
            <form className="tool-panel auth-card" onSubmit={submitAuth}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Account</p>
                  <h2>{authMode === 'login' ? '登录账号' : '注册账号'}</h2>
                </div>
                <KeyRound size={22} aria-hidden="true" />
              </div>
              <div className="segmented-control">
                <button
                  className={authMode === 'login' ? 'active' : ''}
                  type="button"
                  onClick={() => setAuthMode('login')}
                >
                  登录
                </button>
                <button
                  className={authMode === 'register' ? 'active' : ''}
                  type="button"
                  onClick={() => setAuthMode('register')}
                >
                  注册
                </button>
              </div>
              {authMode === 'register' ? (
                <label className="field">
                  <span>姓名</span>
                  <input
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : null}
              <label className="field">
                <span>邮箱</span>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>密码</span>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </label>
              {authMode === 'register' ? (
                <div className="segmented-control role-choice">
                  <button
                    className={authForm.role === 'candidate' ? 'active' : ''}
                    type="button"
                    onClick={() =>
                      setAuthForm((current) => ({
                        ...current,
                        role: 'candidate',
                      }))
                    }
                  >
                    <UserRound size={16} aria-hidden="true" />
                    求职者
                  </button>
                  <button
                    className={authForm.role === 'recruiter' ? 'active' : ''}
                    type="button"
                    onClick={() =>
                      setAuthForm((current) => ({
                        ...current,
                        role: 'recruiter',
                      }))
                    }
                  >
                    <Building2 size={16} aria-hidden="true" />
                    招聘方
                  </button>
                  <button
                    className={authForm.role === 'admin' ? 'active' : ''}
                    type="button"
                    onClick={() =>
                      setAuthForm((current) => ({
                        ...current,
                        role: 'admin',
                      }))
                    }
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                    后台
                  </button>
                </div>
              ) : null}
              <button className="primary-action" disabled={isBusy} type="submit">
                {authMode === 'login' ? (
                  <KeyRound size={18} aria-hidden="true" />
                ) : (
                  <UserPlus size={18} aria-hidden="true" />
                )}
                {authMode === 'login' ? '登录' : '注册'}
              </button>
            </form>
            <section className="content-panel auth-overview">
              <div className="panel-heading split">
                <div>
                  <p className="eyebrow">Demo</p>
                  <h2>演示账号</h2>
                </div>
                <Database size={22} aria-hidden="true" />
              </div>
              <div className="demo-grid">
                <button type="button" onClick={() => loginDemo('candidate')}>
                  <UserRound size={22} aria-hidden="true" />
                  <span>candidate@demo.com</span>
                  <strong>求职者</strong>
                </button>
                <button type="button" onClick={() => loginDemo('recruiter')}>
                  <Building2 size={22} aria-hidden="true" />
                  <span>recruiter@demo.com</span>
                  <strong>招聘方</strong>
                </button>
                <button type="button" onClick={() => loginDemo('admin')}>
                  <ShieldCheck size={22} aria-hidden="true" />
                  <span>admin@demo.com</span>
                  <strong>后台管理</strong>
                </button>
              </div>
            </section>
          </section>
        ) : null}

        {currentUser && activeRole === 'candidate' && candidateProfile ? (
          <section className="workspace" aria-label="求职者工作台">
            <aside className="tool-panel profile-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Candidate</p>
                  <h2>简历与匹配</h2>
                </div>
                <BadgeCheck size={22} aria-hidden="true" />
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>姓名</span>
                  <input
                    value={candidateProfile.name}
                    onChange={(event) =>
                      updateCandidateProfile('name', event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>城市</span>
                  <input
                    value={candidateProfile.location}
                    onChange={(event) =>
                      updateCandidateProfile('location', event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>求职方向</span>
                  <input
                    value={candidateProfile.title}
                    onChange={(event) =>
                      updateCandidateProfile('title', event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>经验</span>
                  <input
                    value={candidateProfile.experience}
                    onChange={(event) =>
                      updateCandidateProfile('experience', event.target.value)
                    }
                  />
                </label>
              </div>

              <label className="upload-zone">
                <UploadCloud size={28} aria-hidden="true" />
                <span>上传简历</span>
                <strong>{candidateProfile.resumeFile || 'PDF / DOCX / TXT'}</strong>
                <small>后端解析并更新技能</small>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={handleResumeUpload}
                />
              </label>

              <label className="field">
                <span>简历亮点</span>
                <textarea
                  value={resumeHighlights}
                  onChange={(event) => setResumeHighlights(event.target.value)}
                  rows={5}
                />
              </label>

              <button
                className="primary-action"
                disabled={isBusy}
                type="button"
                onClick={saveCandidateProfile}
              >
                <Save size={18} aria-hidden="true" />
                保存档案
              </button>

              <div className="score-block">
                <div>
                  <span>目标岗位匹配分</span>
                  <strong>{candidateMatch.score}</strong>
                </div>
                <meter min="0" max="100" value={candidateMatch.score} />
                <div className="chip-row">
                  {candidateMatch.matchedSkills.map((skill) => (
                    <span className="chip matched" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </aside>

            <section className="content-panel" aria-label="岗位搜索">
              <div className="panel-heading split">
                <div>
                  <p className="eyebrow">Jobs</p>
                  <h2>岗位搜寻</h2>
                </div>
                <div className="inline-field search-field">
                  <Search size={18} aria-hidden="true" />
                  <input
                    placeholder="搜索岗位、城市、部门"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="filter-bar" aria-label="岗位筛选">
                <label>
                  <MapPin size={16} aria-hidden="true" />
                  <select
                    value={locationFilter}
                    onChange={(event) => setLocationFilter(event.target.value)}
                  >
                    {cities.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <BriefcaseBusiness size={16} aria-hidden="true" />
                  <select
                    value={departmentFilter}
                    onChange={(event) =>
                      setDepartmentFilter(event.target.value)
                    }
                  >
                    {departments.map((department) => (
                      <option key={department}>{department}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <Filter size={16} aria-hidden="true" />
                  <select
                    value={skillFilter}
                    onChange={(event) => setSkillFilter(event.target.value)}
                  >
                    {allSkills.map((skill) => (
                      <option key={skill}>{skill}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="job-grid">
                {visibleJobs.map((job) => {
                  const match = scoreMatch(
                    currentCandidateSkills,
                    job,
                    `${candidateProfile.resume} ${resumeHighlights}`,
                  )
                  const application = candidateApplications.find(
                    (item) => item.jobId === job.id,
                  )

                  return (
                    <article className="job-card" key={job.id}>
                      <div className="card-topline">
                        <span>{job.stage}</span>
                        <span>{job.posted}</span>
                      </div>
                      <h3>{job.title}</h3>
                      <p>{job.summary}</p>
                      <div className="meta-line">
                        <span>
                          <MapPin size={15} aria-hidden="true" />
                          {job.location}
                        </span>
                        <span>
                          <CalendarCheck size={15} aria-hidden="true" />
                          {job.type}
                        </span>
                        <span>{job.salary}</span>
                      </div>
                      <div className="chip-row">
                        {job.skills.map((skill) => (
                          <span
                            className={
                              match.matchedSkills.includes(skill)
                                ? 'chip matched'
                                : 'chip'
                            }
                            key={skill}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="card-action">
                        <div>
                          <span>AI 匹配</span>
                          <strong>{match.score}</strong>
                        </div>
                        <button
                          disabled={Boolean(application) || isBusy}
                          type="button"
                          onClick={() => applyToJob(job)}
                        >
                          {application ? (
                            <CheckCircle2 size={18} aria-hidden="true" />
                          ) : (
                            <Send size={18} aria-hidden="true" />
                          )}
                          {application ? application.status : '投递'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <section className="application-panel" aria-label="我的投递">
                <div className="panel-heading split">
                  <div>
                    <p className="eyebrow">Applications</p>
                    <h2>我的投递</h2>
                  </div>
                  <ClipboardList size={22} aria-hidden="true" />
                </div>
                <div className="application-list">
                  {candidateApplications.length === 0 ? (
                    <div className="empty-state compact">
                      <FileText size={24} aria-hidden="true" />
                      <strong>暂无投递记录</strong>
                    </div>
                  ) : (
                    candidateApplications.map((application) => {
                      const job = jobs.find((item) => item.id === application.jobId)

                      return (
                        <article className="application-item" key={application.id}>
                          <div>
                            <strong>{job?.title ?? '岗位已删除'}</strong>
                            <span>{formatDate(application.createdAt)}</span>
                          </div>
                          <p>{application.note}</p>
                          <span className="source-pill">{application.status}</span>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            </section>
          </section>
        ) : null}

        {currentUser && activeRole === 'recruiter' ? (
          <section className="workspace recruiter-workspace" aria-label="招聘方工作台">
            <aside className="tool-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Recruiter</p>
                  <h2>{editingJobId ? '编辑岗位' : '岗位发布'}</h2>
                </div>
                <Plus size={22} aria-hidden="true" />
              </div>

              <form className="job-form" onSubmit={submitJob}>
                <label className="field">
                  <span>岗位名称</span>
                  <input
                    value={jobForm.title}
                    onChange={(event) =>
                      updateJobForm('title', event.target.value)
                    }
                    placeholder="例如：增长产品经理"
                  />
                </label>

                <div className="field-grid">
                  <label className="field">
                    <span>部门</span>
                    <select
                      value={jobForm.department}
                      onChange={(event) =>
                        updateJobForm('department', event.target.value)
                      }
                    >
                      <option>产品</option>
                      <option>技术</option>
                      <option>人力资源</option>
                      <option>数据</option>
                      <option>销售</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>城市</span>
                    <select
                      value={jobForm.location}
                      onChange={(event) =>
                        updateJobForm('location', event.target.value)
                      }
                    >
                      <option>上海</option>
                      <option>北京</option>
                      <option>深圳</option>
                      <option>杭州</option>
                      <option>远程</option>
                    </select>
                  </label>
                </div>

                <div className="field-grid">
                  <label className="field">
                    <span>类型</span>
                    <select
                      value={jobForm.type}
                      onChange={(event) =>
                        updateJobForm('type', event.target.value)
                      }
                    >
                      <option>全职</option>
                      <option>混合办公</option>
                      <option>远程</option>
                      <option>实习</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>状态</span>
                    <select
                      value={jobForm.status}
                      onChange={(event) =>
                        setJobForm((current) => ({
                          ...current,
                          status: event.target.value as JobStatus,
                        }))
                      }
                    >
                      <option value="open">招聘中</option>
                      <option value="paused">已暂停</option>
                      <option value="closed">已关闭</option>
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>经验</span>
                  <select
                    value={jobForm.level}
                    onChange={(event) =>
                      updateJobForm('level', event.target.value)
                    }
                  >
                    <option>应届</option>
                    <option>1-3 年</option>
                    <option>3-5 年</option>
                    <option>5 年以上</option>
                    <option>中高级</option>
                  </select>
                </label>

                <label className="field">
                  <span>薪资</span>
                  <input
                    value={jobForm.salary}
                    onChange={(event) =>
                      updateJobForm('salary', event.target.value)
                    }
                    placeholder="例如：25k-40k"
                  />
                </label>

                <label className="field">
                  <span>核心技能</span>
                  <input
                    value={jobForm.skills}
                    onChange={(event) =>
                      updateJobForm('skills', event.target.value)
                    }
                    placeholder="React, TypeScript, AI"
                  />
                </label>

                <label className="field">
                  <span>岗位描述</span>
                  <textarea
                    value={jobForm.summary}
                    onChange={(event) =>
                      updateJobForm('summary', event.target.value)
                    }
                    rows={4}
                  />
                </label>

                <div className="button-row">
                  <button
                    className="primary-action"
                    disabled={isBusy}
                    type="submit"
                  >
                    {editingJobId ? (
                      <Save size={18} aria-hidden="true" />
                    ) : (
                      <Plus size={18} aria-hidden="true" />
                    )}
                    {editingJobId ? '保存岗位' : '发布岗位'}
                  </button>
                  {editingJobId ? (
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() => {
                        setEditingJobId('')
                        setJobForm(defaultJobForm)
                      }}
                    >
                      <X size={18} aria-hidden="true" />
                      取消
                    </button>
                  ) : null}
                </div>
              </form>

              <div className="management-list">
                <div className="panel-heading compact-heading">
                  <div>
                    <p className="eyebrow">Manage</p>
                    <h2>岗位管理</h2>
                  </div>
                  <button type="button" onClick={refreshAll}>
                    <RefreshCw size={17} aria-hidden="true" />
                  </button>
                </div>
                {jobs.map((job) => (
                  <article className="management-item" key={job.id}>
                    <div>
                      <strong>{job.title}</strong>
                      <span>{statusLabel(job.status)} · {job.applicants} 份简历</span>
                    </div>
                    <div className="icon-actions">
                      <button type="button" onClick={() => editJob(job)}>
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateJobStatus(
                            job,
                            job.status === 'open' ? 'paused' : 'open',
                          )
                        }
                      >
                        <CalendarCheck size={16} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => deleteJob(job)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </aside>

            <section className="content-panel" aria-label="简历筛选">
              <div className="panel-heading split">
                <div>
                  <p className="eyebrow">Screening</p>
                  <h2>简历筛选</h2>
                </div>
                <div className="inline-field search-field">
                  <Search size={18} aria-hidden="true" />
                  <input
                    placeholder="搜索候选人"
                    value={candidateSearch}
                    onChange={(event) => setCandidateSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="screening-controls">
                <label>
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  <select
                    value={screeningJobId}
                    onChange={(event) => setScreeningJobId(event.target.value)}
                  >
                    {jobs.map((job) => (
                      <option value={job.id} key={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="range-field">
                  <span>最低分 {minScore}</span>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={minScore}
                    onChange={(event) => setMinScore(Number(event.target.value))}
                  />
                </label>
              </div>

              <div className="candidate-list">
                {screenedCandidates.length === 0 ? (
                  <div className="empty-state">
                    <FileText size={28} aria-hidden="true" />
                    <strong>暂无符合条件的简历</strong>
                    <span>降低最低分或更换岗位后继续筛选</span>
                  </div>
                ) : (
                  screenedCandidates.map((candidate) => (
                    <article className="candidate-card" key={candidate.id}>
                      <div className="candidate-avatar" aria-hidden="true">
                        {candidate.name.slice(0, 1)}
                      </div>
                      <div className="candidate-main">
                        <div className="candidate-heading">
                          <div>
                            <h3>{candidate.name}</h3>
                            <p>
                              {candidate.title} · {candidate.location} ·{' '}
                              {candidate.experience}
                            </p>
                          </div>
                          <span className="source-pill">{candidate.source}</span>
                        </div>
                        <p className="resume-line">{candidate.resume}</p>
                        <div className="chip-row">
                          {candidate.skills.map((skill) => (
                            <span
                              className={
                                candidate.matchedSkills.includes(skill)
                                  ? 'chip matched'
                                  : 'chip'
                              }
                              key={skill}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="candidate-score">
                        <span>匹配分</span>
                        <strong>{candidate.score}</strong>
                        <meter min="0" max="100" value={candidate.score} />
                        <button
                          type="button"
                          className={
                            candidate.status === '已收藏' ? 'saved' : ''
                          }
                          onClick={() => toggleCandidateSaved(candidate)}
                        >
                          <CheckCircle2 size={18} aria-hidden="true" />
                          {candidate.status === '已收藏' ? '已收藏' : '收藏'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openCandidateDetails(candidate)}
                        >
                          <Eye size={18} aria-hidden="true" />
                          详情
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>
        ) : null}

        {currentUser && activeRole === 'admin' && adminOverview ? (
          <section className="admin-workspace" aria-label="后台管理工作台">
            <section className="content-panel">
              <div className="panel-heading split">
                <div>
                  <p className="eyebrow">Admin</p>
                  <h2>用户管理</h2>
                </div>
                <ShieldCheck size={22} aria-hidden="true" />
              </div>
              <div className="admin-metrics">
                <div>
                  <span>用户</span>
                  <strong>{adminOverview.metrics.users}</strong>
                </div>
                <div>
                  <span>启用</span>
                  <strong>{adminOverview.metrics.activeUsers}</strong>
                </div>
                <div>
                  <span>投递</span>
                  <strong>{adminOverview.metrics.applications}</strong>
                </div>
              </div>
              <div className="admin-list">
                {adminOverview.users.map((user) => (
                  <article className="admin-row" key={user.id}>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <select
                      value={user.role}
                      onChange={(event) =>
                        updateUser(user, { role: event.target.value as Role })
                      }
                    >
                      <option value="candidate">求职方</option>
                      <option value="recruiter">招聘方</option>
                      <option value="admin">后台</option>
                    </select>
                    <select
                      value={user.status ?? 'active'}
                      onChange={(event) =>
                        updateUser(user, {
                          status: event.target.value as User['status'],
                        })
                      }
                    >
                      <option value="active">启用</option>
                      <option value="disabled">停用</option>
                    </select>
                  </article>
                ))}
              </div>
            </section>

            <section className="content-panel">
              <div className="panel-heading split">
                <div>
                  <p className="eyebrow">Jobs</p>
                  <h2>岗位监管</h2>
                </div>
                <BriefcaseBusiness size={22} aria-hidden="true" />
              </div>
              <div className="admin-list">
                {jobs.map((job) => (
                  <article className="admin-row job-admin-row" key={job.id}>
                    <div>
                      <strong>{job.title}</strong>
                      <span>
                        {job.department} · {job.location} · {job.applicants} 份简历
                      </span>
                    </div>
                    <select
                      value={job.status}
                      onChange={(event) =>
                        updateJobStatus(job, event.target.value as JobStatus)
                      }
                    >
                      <option value="open">招聘中</option>
                      <option value="paused">已暂停</option>
                      <option value="closed">已关闭</option>
                    </select>
                    <button type="button" onClick={() => deleteJob(job)}>
                      <Trash2 size={16} aria-hidden="true" />
                      删除
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="content-panel admin-wide">
              <div className="panel-heading split">
                <div>
                  <p className="eyebrow">Applications</p>
                  <h2>投递监管</h2>
                </div>
                <ClipboardList size={22} aria-hidden="true" />
              </div>
              <div className="application-list">
                {applications.map((application) => {
                  const job = jobs.find((item) => item.id === application.jobId)
                  const candidate = candidates.find(
                    (item) => item.id === application.candidateId,
                  )

                  return (
                    <article className="application-item" key={application.id}>
                      <div>
                        <strong>
                          {candidate?.name ?? '未知候选人'} →{' '}
                          {job?.title ?? '岗位已删除'}
                        </strong>
                        <span>{formatDate(application.createdAt)}</span>
                      </div>
                      <p>{application.note}</p>
                      <span className="source-pill">{application.status}</span>
                    </article>
                  )
                })}
              </div>
            </section>
          </section>
        ) : null}

        {currentUser ? (
          <section className="pipeline-band" aria-label="招聘漏斗">
            {[
              ['新简历', pipelineCounts.applied],
              ['AI 推荐', pipelineCounts.recommended],
              ['业务面试', pipelineCounts.interview],
              ['Offer', pipelineCounts.offer],
            ].map(([stage, count]) => (
              <div className="pipeline-step" key={stage}>
                <FileText size={18} aria-hidden="true" />
                <span>{stage}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </section>
        ) : null}
      </main>

      {selectedCandidate ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-label="候选人详情"
            className="candidate-modal"
            role="dialog"
          >
            <div className="panel-heading split">
              <div>
                <p className="eyebrow">Candidate Detail</p>
                <h2>{selectedCandidate.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedCandidateId('')}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="detail-grid">
              <div>
                <span>方向</span>
                <strong>{selectedCandidate.title}</strong>
              </div>
              <div>
                <span>城市</span>
                <strong>{selectedCandidate.location}</strong>
              </div>
              <div>
                <span>经验</span>
                <strong>{selectedCandidate.experience}</strong>
              </div>
              <div>
                <span>简历文件</span>
                <strong>{selectedCandidate.resumeFile || '未上传'}</strong>
              </div>
            </div>

            <div className="chip-row modal-chips">
              {selectedCandidate.skills.map((skill) => (
                <span className="chip matched" key={skill}>
                  {skill}
                </span>
              ))}
            </div>

            <p className="resume-detail">{selectedCandidate.resume}</p>

            <div className="field-grid">
              <label className="field">
                <span>候选人状态</span>
                <select
                  value={candidateStatus}
                  onChange={(event) => setCandidateStatus(event.target.value)}
                >
                  <option>待筛选</option>
                  <option>已收藏</option>
                  <option>已约面</option>
                  <option>已淘汰</option>
                </select>
              </label>
              <label className="field">
                <span>投递状态</span>
                <select
                  disabled={!selectedApplication}
                  value={applicationStatus}
                  onChange={(event) => setApplicationStatus(event.target.value)}
                >
                  <option>已投递</option>
                  <option>AI 推荐</option>
                  <option>业务面试</option>
                  <option>Offer</option>
                  <option>不合适</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>招聘备注</span>
              <textarea
                value={candidateNotes}
                onChange={(event) => setCandidateNotes(event.target.value)}
                rows={4}
              />
            </label>

            <label className="field">
              <span>投递备注</span>
              <textarea
                disabled={!selectedApplication}
                value={
                  selectedApplication
                    ? applicationNote
                    : '当前岗位暂无投递记录'
                }
                onChange={(event) => setApplicationNote(event.target.value)}
                rows={3}
              />
            </label>

            <button
              className="primary-action"
              disabled={isBusy}
              type="button"
              onClick={saveCandidateDetails}
            >
              <Save size={18} aria-hidden="true" />
              保存详情
            </button>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
