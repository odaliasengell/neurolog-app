// src/app/dashboard/children/[id]/page.tsx
// Página de detalles de niño actualizada con el nuevo modelo

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChildren } from '@/hooks/use-children';
import { useLogs } from '@/hooks/use-logs';
import { supabase } from '@/lib/supabase';
import type { 
  ChildWithRelation, 
  UserChildRelation, 
  LogWithDetails,
  EmergencyContact,
  Profile
} from '@/types';
import { 
  EditIcon,
  MoreVerticalIcon,
  UserPlusIcon,
  CalendarIcon,
  HeartIcon,
  PhoneIcon,
  MapPinIcon,
  BookOpenIcon,
  TrendingUpIcon,
  BarChart3Icon,
  DownloadIcon,
  PlusIcon,
  UsersIcon,
  ActivityIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  GraduationCapIcon,
  ShieldIcon
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';

// ================================================================
// COMPONENTES AUXILIARES
// ================================================================

interface ChildInfoCardProps {
  child: ChildWithRelation;
}

function ChildInfoCard({ child }: ChildInfoCardProps) {
  const calculateAge = (birthDate: string) => {
    return differenceInYears(new Date(), new Date(birthDate));
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'parent': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'specialist': return 'bg-purple-100 text-purple-800';
      case 'observer': return 'bg-gray-100 text-gray-800';
      case 'family': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start space-x-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={child.avatar_url} alt={child.name} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-3xl font-bold">
              {child.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{child.name}</h1>
              <Badge className={`text-sm ${getRelationshipColor(child.relationship_type)}`}>
                {child.relationship_type}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {child.birth_date && (
                <div className="flex items-center text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>
                    {calculateAge(child.birth_date)} años 
                    ({format(new Date(child.birth_date), 'dd MMMM yyyy', { locale: es })})
                  </span>
                </div>
              )}
              
              {child.diagnosis && (
                <div className="flex items-center text-gray-600">
                  <HeartIcon className="h-4 w-4 mr-2" />
                  <span>{child.diagnosis}</span>
                </div>
              )}
              
              <div className="flex items-center text-gray-600">
                <ActivityIcon className="h-4 w-4 mr-2" />
                <span>
                  Registrado el {format(new Date(child.created_at), 'dd MMM yyyy', { locale: es })}
                </span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <UsersIcon className="h-4 w-4 mr-2" />
                <span>Creado por {child.creator_name}</span>
              </div>
            </div>
            
            {child.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{child.notes}</p>
              </div>
            )}
            
            {/* Permissions */}
            <div className="mt-4 flex items-center space-x-4 text-xs text-gray-500">
              {child.can_edit && (
                <div className="flex items-center">
                  <EditIcon className="h-3 w-3 mr-1 text-green-600" />
                  <span>Puede editar</span>
                </div>
              )}
              {child.can_export && (
                <div className="flex items-center">
                  <DownloadIcon className="h-3 w-3 mr-1 text-blue-600" />
                  <span>Puede exportar</span>
                </div>
              )}
              {child.can_invite_others && (
                <div className="flex items-center">
                  <UserPlusIcon className="h-3 w-3 mr-1 text-purple-600" />
                  <span>Puede invitar usuarios</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmergencyContactsProps {
  contacts: EmergencyContact[];
}

function EmergencyContacts({ contacts }: EmergencyContactsProps) {
  if (!contacts || contacts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <PhoneIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay contactos de emergencia registrados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {contacts.map((contact, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <PhoneIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{contact.name}</h3>
                  <p className="text-sm text-gray-600">{contact.relationship}</p>
                  <p className="text-sm text-gray-500">{contact.phone}</p>
                </div>
              </div>
              {contact.is_primary && (
                <Badge variant="outline" className="text-xs">
                  Principal
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface MedicalInfoProps {
  medicalInfo: any;
}

function MedicalInfo({ medicalInfo }: MedicalInfoProps) {
  const hasInfo = medicalInfo && (
    medicalInfo.allergies?.length > 0 ||
    medicalInfo.medications?.length > 0 ||
    medicalInfo.conditions?.length > 0 ||
    medicalInfo.emergency_notes
  );

  if (!hasInfo) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <HeartIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay información médica registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {medicalInfo.allergies?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircleIcon className="h-5 w-5 mr-2 text-red-500" />
              Alergias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {medicalInfo.allergies.map((allergy: string, index: number) => (
                <Badge key={index} variant="destructive">
                  {allergy}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {medicalInfo.medications?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Medicamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {medicalInfo.medications.map((medication: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {medication}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {medicalInfo.conditions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Condiciones Médicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {medicalInfo.conditions.map((condition: string, index: number) => (
                <Badge key={index} variant="outline">
                  {condition}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {medicalInfo.emergency_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-orange-600">
              Notas de Emergencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 bg-orange-50 p-3 rounded">
              {medicalInfo.emergency_notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface EducationalInfoProps {
  educationalInfo: any;
}

function EducationalInfo({ educationalInfo }: EducationalInfoProps) {
  const hasInfo = educationalInfo && (
    educationalInfo.school ||
    educationalInfo.grade ||
    educationalInfo.teacher ||
    educationalInfo.iep_goals?.length > 0 ||
    educationalInfo.accommodations?.length > 0
  );

  if (!hasInfo) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <GraduationCapIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay información educativa registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información Académica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {educationalInfo.school && (
            <div>
              <label className="text-sm font-medium text-gray-600">Institución</label>
              <p className="text-gray-900">{educationalInfo.school}</p>
            </div>
          )}
          {educationalInfo.grade && (
            <div>
              <label className="text-sm font-medium text-gray-600">Grado/Nivel</label>
              <p className="text-gray-900">{educationalInfo.grade}</p>
            </div>
          )}
          {educationalInfo.teacher && (
            <div>
              <label className="text-sm font-medium text-gray-600">Docente Principal</label>
              <p className="text-gray-900">{educationalInfo.teacher}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IEP Goals */}
      {educationalInfo.iep_goals?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Objetivos IEP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {educationalInfo.iep_goals.map((goal: string, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                  <p className="text-sm text-gray-700">{goal}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accommodations */}
      {educationalInfo.accommodations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acomodaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {educationalInfo.accommodations.map((accommodation: string, index: number) => (
                <Badge key={index} variant="outline">
                  {accommodation}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface RecentLogsProps {
  childId: string;
}

function RecentLogs({ childId }: RecentLogsProps) {
  const { logs, loading } = useLogs({ 
    childId, 
    pageSize: 10,
    includePrivate: true 
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <BookOpenIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay registros documentados aún</p>
          <Button asChild className="mt-4">
            <Link href={`/dashboard/logs/new?child_id=${childId}`}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Crear Primer Registro
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {logs.slice(0, 5).map((log) => (
        <Card key={log.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">{log.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {log.content}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>
                    {format(new Date(log.log_date), 'dd MMM yyyy', { locale: es })}
                  </span>
                  {log.category_name && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                      style={{ 
                        backgroundColor: `${log.category_color}20`,
                        color: log.category_color 
                      }}
                    >
                      {log.category_name}
                    </Badge>
                  )}
                  {log.mood_score && (
                    <span className="flex items-center">
                      <HeartIcon className="h-3 w-3 mr-1 text-red-400" />
                      {log.mood_score}/5
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/logs/${log.id}`}>
                  <EyeIcon className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {logs.length > 5 && (
        <div className="text-center">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/logs?child_id=${childId}`}>
              Ver todos los registros ({logs.length})
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

interface UserManagementProps {
  child: ChildWithRelation;
}

function UserManagement({ child }: UserManagementProps) {
  const [relations, setRelations] = useState<(UserChildRelation & { user: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelations() {
      try {
        const { data, error } = await supabase
          .from('user_child_relations')
          .select(`
            *,
            profiles!user_child_relations_user_id_fkey (
              id,
              full_name,
              email,
              role,
              avatar_url
            )
          `)
          .eq('child_id', child.id)
          .eq('is_active', true);

        if (error) throw error;
        
        setRelations(data?.map(rel => ({
          ...rel,
          user: rel.profiles as Profile
        })) || []);
      } catch (error) {
        console.error('Error fetching relations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRelations();
  }, [child.id]);

  if (loading) {
    return <div>Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-4">
      {relations.map((relation) => (
        <Card key={relation.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={relation.user.avatar_url} />
                  <AvatarFallback>
                    {relation.user.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{relation.user.full_name}</h3>
                  <p className="text-sm text-gray-600">{relation.user.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {relation.relationship_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {relation.user.role}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-xs">
                {relation.can_view && <EyeIcon className="h-4 w-4 text-green-600" />}
                {relation.can_edit && <EditIcon className="h-4 w-4 text-blue-600" />}
                {relation.can_export && <DownloadIcon className="h-4 w-4 text-purple-600" />}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================

export default function ChildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { children, loading, error } = useChildren();
  
  const childId = params.id as string;
  const child = children.find(c => c.id === childId);

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-40 bg-gray-200 rounded" />
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>
              {error || 'No se pudo cargar la información del niño'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()} className="w-full">
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          ← Volver
        </Button>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/children/${child.id}/reports`}>
              <BarChart3Icon className="mr-2 h-4 w-4" />
              Reportes
            </Link>
          </Button>
          
          {child.can_edit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <MoreVerticalIcon className="mr-2 h-4 w-4" />
                  Acciones
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/children/${child.id}/edit`}>
                    <EditIcon className="mr-2 h-4 w-4" />
                    Editar Información
                  </Link>
                </DropdownMenuItem>
                {child.can_invite_others && (
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/children/${child.id}/users`}>
                      <UserPlusIcon className="mr-2 h-4 w-4" />
                      Gestionar Usuarios
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/logs/new?child_id=${child.id}`}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Nuevo Registro
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Child Info */}
      <ChildInfoCard child={child} />

      {/* Tabs */}
      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="logs">Registros</TabsTrigger>
          <TabsTrigger value="emergency">Emergencia</TabsTrigger>
          <TabsTrigger value="medical">Médico</TabsTrigger>
          <TabsTrigger value="educational">Educativo</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registros Recientes</CardTitle>
                  <CardDescription>
                    Últimas observaciones y eventos documentados
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href={`/dashboard/logs/new?child_id=${child.id}`}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Nuevo Registro
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RecentLogs childId={child.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle>Contactos de Emergencia</CardTitle>
              <CardDescription>
                Personas a contactar en caso de emergencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyContacts contacts={child.emergency_contact} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical">
          <Card>
            <CardHeader>
              <CardTitle>Información Médica</CardTitle>
              <CardDescription>
                Alergias, medicamentos y condiciones de salud
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MedicalInfo medicalInfo={child.medical_info} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="educational">
          <Card>
            <CardHeader>
              <CardTitle>Información Educativa</CardTitle>
              <CardDescription>
                Datos académicos, objetivos IEP y acomodaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EducationalInfo educationalInfo={child.educational_info} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuarios con Acceso</CardTitle>
                  <CardDescription>
                    Personas que pueden ver o editar la información
                  </CardDescription>
                </div>
                {child.can_invite_others && (
                  <Button asChild>
                    <Link href={`/dashboard/children/${child.id}/users/invite`}>
                      <UserPlusIcon className="mr-2 h-4 w-4" />
                      Invitar Usuario
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <UserManagement child={child} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Privacidad</CardTitle>
              <CardDescription>
                Controles de privacidad y compartición de datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Compartir con Especialistas</h3>
                    <p className="text-sm text-gray-600">
                      {child.privacy_settings?.share_with_specialists ? 'Habilitado' : 'Deshabilitado'}
                    </p>
                  </div>
                  <ShieldIcon className={`h-5 w-5 ${
                    child.privacy_settings?.share_with_specialists ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Reportes de Progreso</h3>
                    <p className="text-sm text-gray-600">
                      {child.privacy_settings?.share_progress_reports ? 'Habilitado' : 'Deshabilitado'}
                    </p>
                  </div>
                  <BarChart3Icon className={`h-5 w-5 ${
                    child.privacy_settings?.share_progress_reports ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}