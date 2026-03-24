"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { requireAuth, logout } from "@/lib/auth"
import {
  getQuestionnaires,
  saveQuestionnaire,
  deleteQuestionnaire,
  getAllUsers,
  assignQuestionnaireToUser,
  saveUser,
  deleteUser,
  getDashboardStats,
  getRecentActivity,
} from "@/lib/storage"
import { sendEmailNotification, createNotification } from "@/lib/notifications"
import { NotificationBell } from "@/components/notification-bell"
import type { Questionnaire, Question, User, Notification } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  LayoutDashboard,
  FileText,
  Users,
  Plus,
  Trash2,
  LogOut,
  CheckCircle2,
  XCircle,
  Upload,
  Send,
  Eye,
  Download,
} from "lucide-react"
import { Logo } from "@/components/logo"
import { exportResponsesAsPDF } from "@/lib/export-pdf"

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalQuestionnaires: 0,
    activeQuestionnaires: 0,
    totalSessions: 0,
    completedSessions: 0,
    totalQuestions: 0,
    totalAnswers: 0,
    totalAuditLogs: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // New Questionnaire Dialog State
  const [showNewQuestionnaire, setShowNewQuestionnaire] = useState(false)
  const [newQTitle, setNewQTitle] = useState("")
  const [newQDescription, setNewQDescription] = useState("")
  const [newQuestions, setNewQuestions] = useState<string[]>([""])

  // CSV Upload State
  const [csvText, setCsvText] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")



  const loadData = useCallback(async () => {
    try {
      const [questionnairesData, usersData, statsData, activityData] = await Promise.all([
        getQuestionnaires(),
        getAllUsers(),
        getDashboardStats(),
        getRecentActivity(),
      ])
      setQuestionnaires(questionnairesData)
      setUsers(usersData)
      setStats(statsData)
      setRecentActivity(activityData)
    } catch (error) {
      console.error("Failed to load data:", error)
    }
  }, [])

  useEffect(() => {
    const currentUser = requireAuth("admin")
    if (!currentUser) {
      router.push("/")
      return
    }
    setUser(currentUser)
    loadData()
    setLoading(false)
  }, [router, loadData])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleCreateQuestionnaire = async () => {
    if (!newQTitle.trim() || !user) return

    const questions: Question[] = newQuestions
      .filter((q) => q.trim())
      .map((q, index) => ({
        id: `q-${Date.now()}-${index}`,
        text: q.trim(),
        order: index + 1,
        questionnaireId: `questionnaire-${Date.now()}`,
      }))

    if (questions.length === 0) return

    const newQuestionnaire: Questionnaire = {
      id: `questionnaire-${Date.now()}`,
      title: newQTitle.trim(),
      description: newQDescription.trim(),
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      questions,
      isActive: true,
    }

    try {
      await saveQuestionnaire(newQuestionnaire)
      loadData()
      setShowNewQuestionnaire(false)
      setNewQTitle("")
      setNewQDescription("")
      setNewQuestions([""])
    } catch (error) {
      console.error("Failed to create questionnaire:", error)
    }
  }

  const handleCreateQuestionnaireFromCSV = async () => {
    if (!csvText.trim() || !user) return

    const lines = csvText.split("\n").filter((line) => line.trim())
    if (lines.length === 0) return

    const questions: Question[] = lines.map((line, index) => ({
      id: `q-${Date.now()}-${index}`,
      text: line.trim(),
      order: index + 1,
      questionnaireId: `questionnaire-${Date.now()}`,
    }))

    const newQuestionnaire: Questionnaire = {
      id: `questionnaire-${Date.now()}`,
      title: newQTitle.trim() || "Imported Questionnaire",
      description: newQDescription.trim() || "Imported from CSV",
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      questions,
      isActive: true,
    }

    try {
      await saveQuestionnaire(newQuestionnaire)
      loadData()
      setShowNewQuestionnaire(false)
      setNewQTitle("")
      setNewQDescription("")
      setCsvText("")
    } catch (error) {
      console.error("Failed to create questionnaire from CSV:", error)
    }
  }

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    if (!newQTitle.trim()) {
      setNewQTitle(file.name.replace(/\.[^/.]+$/, ""))
    }
  }

  const handleCreateQuestionnaireFromFile = async () => {
    if (!uploadedFile || !user) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      if (newQTitle.trim()) {
        formData.append('title', newQTitle.trim())
      }
      if (newQDescription.trim()) {
        formData.append('description', newQDescription.trim())
      }

      // Use fetch directly for file upload
      const token = localStorage.getItem('izingcweti_auth')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/questionnaires/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JSON.parse(token || '{}').token || ''}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      loadData()
      setShowNewQuestionnaire(false)
      setNewQTitle("")
      setNewQDescription("")
      setUploadedFile(null)
    } catch (error) {
      console.error("Failed to upload questionnaire:", error)
      alert("Failed to upload file. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteQuestionnaire = async (id: string) => {
    if (!confirm("Are you sure you want to delete this questionnaire?")) return

    try {
      await deleteQuestionnaire(id)
      loadData()
    } catch (error) {
      console.error("Failed to delete questionnaire:", error)
    }
  }

  const handleAssignQuestionnaire = async (userId: string, questionnaireId: string) => {
    try {
      await assignQuestionnaireToUser(userId, questionnaireId || "")
      loadData()
      const user = users.find(u => u.id === userId)
      const questionnaire = questionnaires.find(q => q.id === questionnaireId)
      if (questionnaireId && user && questionnaire) {
        setSuccessMessage(`✅ Questionnaire "${questionnaire.title}" has been successfully assigned to ${user.name}!`)
        setTimeout(() => setSuccessMessage(""), 5000) // Clear after 5 seconds
      }
    } catch (error) {
      console.error("Failed to assign questionnaire:", error)
    }
  }

  const handleSendQuestionnaire = async (userId: string, questionnaireId: string) => {
    const userObj = users.find((u) => u.id === userId)
    if (!userObj || !questionnaireId) return

    const questionnaire = questionnaires.find((q) => q.id === questionnaireId)
    if (!questionnaire) return

    try {
      // Assign the questionnaire first
      await assignQuestionnaireToUser(userId, questionnaireId)

      // Send email notification
      await sendEmailNotification(
        userObj.email,
        "New Questionnaire Assigned - IICTS",
        `Dear ${userObj.name},\n\nA new questionnaire has been assigned to you: "${questionnaire.title}"\n\n${questionnaire.description}\n\nPlease log in to the platform to complete it at your earliest convenience.\n\nBest regards,\nIzingcweti ICT Solutions`
      )

      // Create notification for the user
      await createNotification({
        userId: userObj.id,
        type: "assignment",
        title: "New Questionnaire Assigned",
        message: `You have been assigned the "${questionnaire.title}" questionnaire. Please log in to complete it.`,
        read: false,
      })

      loadData()
      setSuccessMessage(`✅ Questionnaire "${questionnaire.title}" has been successfully sent to ${userObj.name}! They will receive an email notification.`)
      setTimeout(() => setSuccessMessage(""), 5000) // Clear after 5 seconds
    } catch (error) {
      console.error("Failed to send questionnaire:", error)
    }
  }



  const handleExportResponses = () => {
    // For now, export basic questionnaire and user info
    // In production, this should export actual responses
    const exportData = questionnaires.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      questionsCount: q.questions.length,
      createdBy: users.find(u => u.id === q.createdBy)?.name || 'Unknown',
      createdAt: q.createdAt,
    }))
    exportResponsesAsPDF(exportData, "questionnaire-summary")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" showText={true} />
              <Badge variant="secondary" className="gap-1">
                <LayoutDashboard className="w-3 h-3" />
                Admin Dashboard
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell notifications={notifications} />
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="questionnaires" className="gap-2">
              <FileText className="w-4 h-4" />
              Questionnaires
            </TabsTrigger>
            <TabsTrigger value="stakeholders" className="gap-2">
              <Users className="w-4 h-4" />
              Stakeholders
            </TabsTrigger>
            <TabsTrigger value="responses" className="gap-2">
              <Eye className="w-4 h-4" />
              Responses
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Dashboard Overview</h2>
              <p className="text-muted-foreground">Comprehensive database statistics and system overview</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeUsers} active users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Questionnaires</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalQuestionnaires}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeQuestionnaires} active questionnaires
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSessions}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.completedSessions} completed sessions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently active in system
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Questionnaires</CardTitle>
                  <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.activeQuestionnaires}</div>
                  <p className="text-xs text-muted-foreground">
                    Available for stakeholders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.completedSessions}</div>
                  <p className="text-xs text-muted-foreground">
                    Successfully finished questionnaires
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Current system status and activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Connection</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Status</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">File Upload Service</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system events and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === 'questionnaire_created' ? 'bg-blue-500' :
                            activity.type === 'questionnaire_assigned' ? 'bg-green-500' :
                            'bg-purple-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{activity.description}</p>
                            {activity.timestamp && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(activity.timestamp).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">No recent activity</p>
                          <p className="text-xs text-muted-foreground">Create questionnaires and assign them to see activity here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Questionnaire Management */}
          <TabsContent value="questionnaires" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Questionnaire Management</h2>
                <p className="text-muted-foreground">Upload and manage questionnaires</p>
              </div>
              <Dialog open={showNewQuestionnaire} onOpenChange={setShowNewQuestionnaire}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Questionnaire
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Questionnaire</DialogTitle>
                    <DialogDescription>Add questions manually or import from CSV</DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="manual" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                      <TabsTrigger value="csv">Import</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          placeholder="e.g., Stakeholder Engagement Survey"
                          value={newQTitle}
                          onChange={(e) => setNewQTitle(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Brief description of this questionnaire"
                          value={newQDescription}
                          onChange={(e) => setNewQDescription(e.target.value)}
                        />
                      </div>

                      <div className="space-y-4">
                        <Label>Questions</Label>
                        <div className="space-y-3">
                          {newQuestions.map((question, index) => (
                            <div key={index} className="flex gap-2 items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Question {index + 1}
                                  </span>
                                  {newQuestions.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setNewQuestions(newQuestions.filter((_, i) => i !== index))
                                      }}
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                                <Input
                                  placeholder="Type your question here..."
                                  value={question}
                                  onChange={(e) => {
                                    const updated = [...newQuestions]
                                    updated[index] = e.target.value
                                    setNewQuestions(updated)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      setNewQuestions([...newQuestions, ""])
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setNewQuestions([...newQuestions, ""])}
                            className="flex-1"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Question
                          </Button>
                          <Button
                            onClick={handleCreateQuestionnaire}
                            disabled={!newQTitle.trim() || newQuestions.filter(q => q.trim()).length === 0}
                            className="flex-1"
                          >
                            Create Questionnaire
                          </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Press Enter to quickly add another question, or use the Add Question button.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="csv" className="space-y-4 mt-4">
                      <Tabs defaultValue="text" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="text">Text Import</TabsTrigger>
                          <TabsTrigger value="file">File Upload</TabsTrigger>
                        </TabsList>

                        <TabsContent value="text" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="csv-title">Title</Label>
                            <Input
                              id="csv-title"
                              placeholder="e.g., Imported Questionnaire"
                              value={newQTitle}
                              onChange={(e) => setNewQTitle(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="csv-description">Description</Label>
                            <Textarea
                              id="csv-description"
                              placeholder="Brief description"
                              value={newQDescription}
                              onChange={(e) => setNewQDescription(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="csv-text">Questions (one per line)</Label>
                            <Textarea
                              id="csv-text"
                              placeholder="What is your primary objective?&#10;What challenges are you facing?&#10;What is your timeline?"
                              value={csvText}
                              onChange={(e) => setCsvText(e.target.value)}
                              className="min-h-[200px] font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Enter one question per line</p>
                          </div>

                          <Button onClick={handleCreateQuestionnaireFromCSV} className="w-full">
                            <Upload className="w-4 h-4 mr-2" />
                            Import Questionnaire
                          </Button>
                        </TabsContent>

                        <TabsContent value="file" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="file-title">Title (Optional)</Label>
                            <Input
                              id="file-title"
                              placeholder="Will use filename if empty"
                              value={newQTitle}
                              onChange={(e) => setNewQTitle(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="file-description">Description (Optional)</Label>
                            <Textarea
                              id="file-description"
                              placeholder="Brief description"
                              value={newQDescription}
                              onChange={(e) => setNewQDescription(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="file-upload">Upload File</Label>
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <div className="text-sm">
                                <label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                                  Click to upload
                                </label>
                                <span className="text-muted-foreground"> or drag and drop</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                CSV, Excel (.xlsx, .xls), or PDF files up to 15MB
                              </p>
                              <Input
                                id="file-upload"
                                type="file"
                                accept=".csv,.xlsx,.xls,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    if (file.size > 15 * 1024 * 1024) { // 15MB
                                      alert("File size must be less than 15MB")
                                      return
                                    }
                                    handleFileUpload(file)
                                  }
                                }}
                              />
                              {uploadedFile && (
                                <div className="mt-3 p-2 bg-muted rounded text-sm">
                                  <p className="font-medium">{uploadedFile.name}</p>
                                  <p className="text-muted-foreground">
                                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <Button
                            onClick={handleCreateQuestionnaireFromFile}
                            disabled={!uploadedFile || uploading}
                            className="w-full"
                          >
                            {uploading ? (
                              <>Uploading...</>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Questionnaire
                              </>
                            )}
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {questionnaires.map((q) => (
                <Card key={q.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{q.title}</CardTitle>
                        <CardDescription>{q.description}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestionnaire(q.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{q.questions.length} questions</span>
                        <Badge variant={q.isActive ? "default" : "secondary"}>
                          {q.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <details className="text-sm">
                        <summary className="cursor-pointer text-primary hover:underline">View all questions</summary>
                        <ol className="mt-3 space-y-2 pl-5 list-decimal">
                          {q.questions.map((question, idx) => (
                            <li key={question.id} className="text-muted-foreground">
                              {question.text}
                            </li>
                          ))}
                        </ol>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {questionnaires.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No questionnaires yet. Create your first one!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Stakeholder Management */}
          <TabsContent value="stakeholders" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Stakeholder Management</h2>
                <p className="text-muted-foreground">Registered stakeholders and questionnaire assignments</p>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Questionnaire</TableHead>
                      <TableHead className="text-right">Send Questionnaire</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          {u.isActive ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <select
                            className="text-sm border rounded px-2 py-1 bg-background"
                            value={u.assignedQuestionnaireId || ""}
                            onChange={(e) => handleAssignQuestionnaire(u.id, e.target.value)}
                          >
                            <option value="">None</option>
                            {questionnaires.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.title}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {u.assignedQuestionnaireId && u.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendQuestionnaire(u.id, u.assignedQuestionnaireId!)}
                              title="Send questionnaire to stakeholder"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No registered stakeholders yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>



          {/* Responses */}
          <TabsContent value="responses" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Response Review</h2>
                <p className="text-muted-foreground">Review and export stakeholder responses</p>
              </div>
              <Button onClick={handleExportResponses}>
                <Download className="w-4 h-4 mr-2" />
                Export as PDF
              </Button>
            </div>

            <div className="grid gap-4">
              {questionnaires.map((questionnaire) => {
                const stakeholder = users.find(s => s.id === questionnaire.createdBy)
                return (
                  <Card key={questionnaire.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{questionnaire.title}</CardTitle>
                          <CardDescription>
                            {stakeholder ? `Assigned to: ${stakeholder.name}` : "Unassigned"}
                          </CardDescription>
                        </div>
                        <Badge variant={questionnaire.isActive ? "default" : "secondary"}>
                          {questionnaire.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(questionnaire.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm">
                          {questionnaire.questions.length} questions
                        </p>
                        <details className="text-sm">
                          <summary className="cursor-pointer text-primary hover:underline">
                            View questions and responses
                          </summary>
                          <div className="mt-3 space-y-3">
                            {questionnaire.questions.map((question, idx) => (
                              <div key={question.id} className="border rounded p-3">
                                <p className="font-medium">Q{idx + 1}: {question.text}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Response: [Response data would be displayed here]
                                </p>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              {questionnaires.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No responses found.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
