// src/app/dashboard/settings/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/use-toast'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Download,
  Trash2,
  Save,
  Eye
} from 'lucide-react'

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    role: profile?.role || 'parent'
  })

  const [preferences, setPreferences] = useState({
    notifications: true,
    emailAlerts: false,
    weeklyReports: true,
    dataSharing: false
  })

  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      // Aquí iría la lógica para actualizar el perfil
      // const { error } = await supabase.from('profiles').update(profileData).eq('id', profile.id)
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulación
      
      toast({
        title: "¡Perfil actualizado!",
        description: "Los cambios se han guardado correctamente.",
      })
      
      setIsEditing(false)
      refreshProfile()
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = () => {
    const userData = {
      perfil: profileData,
      preferencias: preferences,
      fecha_exportacion: new Date().toISOString()
    }

    const dataStr = JSON.stringify(userData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `datos_neurolog_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Datos exportados",
      description: "Tus datos se han descargado correctamente.",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">
          Gestiona tu perfil y preferencias de la aplicación
        </p>
      </div>

      {/* Perfil de Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Información del Perfil
          </CardTitle>
          <CardDescription>
            Actualiza tu información personal y configuración de cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol en la aplicación</Label>
            <Select 
              value={profileData.role} 
              onValueChange={(value) => setProfileData(prev => ({ ...prev, role: value as any }))}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Padre/Madre</SelectItem>
                <SelectItem value="teacher">Docente</SelectItem>
                <SelectItem value="specialist">Especialista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveProfile} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Editar Perfil
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferencias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Preferencias de Notificaciones
          </CardTitle>
          <CardDescription>
            Controla cómo y cuándo recibes notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Notificaciones en la app</div>
              <div className="text-sm text-gray-500">
                Recibir notificaciones dentro de la aplicación
              </div>
            </div>
            <Switch
              checked={preferences.notifications}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, notifications: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Alertas por email</div>
              <div className="text-sm text-gray-500">
                Recibir alertas importantes por correo electrónico
              </div>
            </div>
            <Switch
              checked={preferences.emailAlerts}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, emailAlerts: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Reportes semanales</div>
              <div className="text-sm text-gray-500">
                Recibir resumen semanal de actividad
              </div>
            </div>
            <Switch
              checked={preferences.weeklyReports}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, weeklyReports: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacidad y Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Privacidad y Seguridad
          </CardTitle>
          <CardDescription>
            Gestiona tus datos y configuración de privacidad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Compartir datos anónimos</div>
              <div className="text-sm text-gray-500">
                Ayudar a mejorar la aplicación compartiendo datos anónimos
              </div>
            </div>
            <Switch
              checked={preferences.dataSharing}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, dataSharing: checked }))
              }
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Button onClick={handleExportData} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Exportar mis datos
            </Button>
            
            <Button variant="outline" className="w-full" disabled>
              <Eye className="h-4 w-4 mr-2" />
              Cambiar contraseña
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Versión de la aplicación:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Última actualización:</span>
              <span className="font-medium">Hoy</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Proyecto académico:</span>
              <span className="font-medium">Arquitectura del Software 2025</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zona de Peligro */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <Trash2 className="h-5 w-5 mr-2" />
            Zona de Peligro
          </CardTitle>
          <CardDescription>
            Acciones irreversibles que afectan tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Eliminar cuenta</h4>
              <p className="text-sm text-red-600 mb-4">
                Esto eliminará permanentemente tu cuenta y todos los datos asociados. 
                Esta acción no se puede deshacer.
              </p>
              <Button variant="destructive" size="sm" disabled>
                Eliminar mi cuenta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}