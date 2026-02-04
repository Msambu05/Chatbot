import json
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Questionnaire, Question, Session, Answer, AuditLog


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    """Handle user login and return JWT token"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return JsonResponse({'error': 'Email and password are required'}, status=400)

        # Find user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)

        # Authenticate user
        user_obj = authenticate(username=user.username, password=password)
        if user_obj is None:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)

        # Check if user has a profile in our custom User model (if exists)
        # For now, we'll assume all authenticated users are valid

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user_obj)
        access_token = str(refresh.access_token)

        # Determine user role (admin or stakeholder)
        role = 'admin' if user_obj.is_superuser else 'stakeholder'

        # Get assigned questionnaire for stakeholders
        assigned_questionnaire_id = None
        if role == 'stakeholder':
            # Get the most recent active session for this stakeholder
            session = Session.objects.filter(user=user_obj, is_completed=False).first()
            if session:
                assigned_questionnaire_id = str(session.questionnaire.id)

        response_data = {
            'token': access_token,
            'refresh': str(refresh),
            'user': {
                'id': str(user_obj.id),
                'username': user_obj.username,
                'email': user_obj.email,
                'name': user_obj.get_full_name() or user_obj.username,
                'role': role,
                'assignedQuestionnaireId': assigned_questionnaire_id,
                'is_active': user_obj.is_active,
            }
        }

        # Log the login action
        AuditLog.objects.create(
            actor=user_obj,
            action='user_login',
            object_type='User',
            object_id=str(user_obj.id),
            payload={'ip_address': request.META.get('REMOTE_ADDR')}
        )

        return JsonResponse(response_data)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


class QuestionnaireListView(APIView):
    """Handle questionnaire CRUD operations"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all questionnaires"""
        questionnaires = Questionnaire.objects.all().order_by('-created_at')
        data = []

        for q in questionnaires:
            questions = Question.objects.filter(questionnaire=q).order_by('position')
            data.append({
                'id': str(q.id),
                'title': q.title,
                'description': q.description,
                'created_by': str(q.created_by.id) if q.created_by else None,
                'created_at': q.created_at.isoformat(),
                'questions': [
                    {
                        'id': str(question.id),
                        'text': question.question_text,
                        'order': question.position,
                        'type': question.type,
                        'required': question.required,
                        'options': question.options or []
                    } for question in questions
                ],
                'is_active': q.is_active
            })

        return Response(data)

    def post(self, request):
        """Create a new questionnaire"""
        try:
            title = request.data.get('title')
            description = request.data.get('description', '')
            questions_data = request.data.get('questions', [])

            if not title or not questions_data:
                return Response({'error': 'Title and questions are required'}, status=status.HTTP_400_BAD_REQUEST)

            # Create questionnaire
            questionnaire = Questionnaire.objects.create(
                title=title,
                description=description,
                created_by=request.user,
                is_active=True
            )

            # Create questions
            for i, q_data in enumerate(questions_data):
                Question.objects.create(
                    questionnaire=questionnaire,
                    question_text=q_data['text'],
                    position=i + 1,
                    type='text',
                    required=True
                )

            # Log the action
            AuditLog.objects.create(
                actor=request.user,
                action='questionnaire_created',
                object_type='Questionnaire',
                object_id=str(questionnaire.id),
                payload={'title': title, 'questions_count': len(questions_data)}
            )

            return Response({
                'id': str(questionnaire.id),
                'title': questionnaire.title,
                'description': questionnaire.description,
                'created_at': questionnaire.created_at.isoformat(),
                'questions': questions_data,
                'is_active': questionnaire.is_active
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuestionnaireDetailView(APIView):
    """Handle individual questionnaire operations"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, questionnaire_id):
        """Delete a questionnaire"""
        try:
            questionnaire = get_object_or_404(Questionnaire, id=questionnaire_id)

            # Log the action
            AuditLog.objects.create(
                actor=request.user,
                action='questionnaire_deleted',
                object_type='Questionnaire',
                object_id=questionnaire_id,
                payload={'title': questionnaire.title}
            )

            questionnaire.delete()
            return Response({'message': 'Questionnaire deleted successfully'})

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserListView(APIView):
    """Handle user CRUD operations"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all users (stakeholders)"""
        users = User.objects.all().order_by('-date_joined')
        data = []

        for user in users:
            # Get assigned questionnaire from active session (not completed)
            active_session = Session.objects.filter(user=user, is_completed=False).first()
            assigned_questionnaire_id = str(active_session.questionnaire.id) if active_session else None

            data.append({
                'id': str(user.id),
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'role': 'admin' if user.is_superuser else 'stakeholder',
                'is_active': user.is_active,
                'assigned_questionnaire_id': assigned_questionnaire_id,
                'created_at': user.date_joined.isoformat()
            })

        return Response(data)

    def post(self, request):
        """Create a new user"""
        try:
            name = request.data.get('name')
            email = request.data.get('email')
            role = request.data.get('role', 'stakeholder')

            if not name or not email:
                return Response({'error': 'Name and email are required'}, status=status.HTTP_400_BAD_REQUEST)

            # Create username from email
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            # Create user
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=name.split()[0] if name.split() else name,
                last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else '',
                is_active=True,
                is_staff=role == 'admin',
                is_superuser=role == 'admin'
            )

            # Set a default password (in production, you'd send an email for password setup)
            user.set_password('defaultpassword123')
            user.save()

            # Log the action
            AuditLog.objects.create(
                actor=request.user,
                action='user_created',
                object_type='User',
                object_id=str(user.id),
                payload={'email': email, 'role': role}
            )

            return Response({
                'id': str(user.id),
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'role': role,
                'is_active': user.is_active,
                'created_at': user.date_joined.isoformat()
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    """Handle individual user operations"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        """Update user details"""
        try:
            user = get_object_or_404(User, id=user_id)
            is_active = request.data.get('is_active')

            if is_active is not None:
                user.is_active = is_active
                user.save()

                # Log the action
                AuditLog.objects.create(
                    actor=request.user,
                    action='user_status_changed',
                    object_type='User',
                    object_id=user_id,
                    payload={'is_active': is_active}
                )

            return Response({
                'id': str(user.id),
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'is_active': user.is_active
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserAssignView(APIView):
    """Handle questionnaire assignment to users"""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        """Assign questionnaire to user"""
        try:
            user = get_object_or_404(User, id=user_id)
            questionnaire_id = request.data.get('questionnaire_id')

            if not questionnaire_id:
                return Response({'error': 'questionnaire_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            questionnaire = get_object_or_404(Questionnaire, id=questionnaire_id)

            # Create a session for the user with this questionnaire
            session, created = Session.objects.update_or_create(
                user=user,
                questionnaire=questionnaire,
                defaults={
                    'current_question_index': 0,
                    'total_questions': questionnaire.questions.count(),
                    'is_completed': False
                }
            )

            AuditLog.objects.create(
                actor=request.user,
                action='questionnaire_assigned',
                object_type='User',
                object_id=user_id,
                payload={'questionnaire_id': questionnaire_id, 'session_id': str(session.id)}
            )

            return Response({
                'message': f'Questionnaire "{questionnaire.title}" assigned to {user.get_full_name() or user.username}',
                'session_id': str(session.id),
                'questionnaire_id': questionnaire_id,
                'user_id': user_id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserRemindView(APIView):
    """Handle sending reminders to users"""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        """Send reminder to user"""
        try:
            user = get_object_or_404(User, id=user_id)

            # Log the reminder action
            AuditLog.objects.create(
                actor=request.user,
                action='reminder_sent',
                object_type='User',
                object_id=user_id,
                payload={'email': user.email}
            )

            return Response({'message': 'Reminder sent successfully'})

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ResponseListView(APIView):
    """Handle response data retrieval"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all responses"""
        answers = Answer.objects.all().select_related('session', 'question').order_by('-answered_at')
        data = []

        for answer in answers:
            data.append({
                'id': str(answer.id),
                'user_id': str(answer.session.user.id),
                'questionnaire_id': str(answer.session.questionnaire.id),
                'question_text': answer.question.question_text,
                'response': answer.answer_text,
                'timestamp': answer.answered_at.isoformat()
            })

        return Response(data)


class DashboardStatsView(APIView):
    """Provide dashboard statistics"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get dashboard statistics"""
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_questionnaires = Questionnaire.objects.count()
        active_questionnaires = Questionnaire.objects.filter(is_active=True).count()
        total_sessions = Session.objects.count()
        completed_sessions = Session.objects.filter(is_completed=True).count()
        total_questions = Question.objects.count()
        total_answers = Answer.objects.count()
        total_audit_logs = AuditLog.objects.count()

        return Response({
            'totalUsers': total_users,
            'activeUsers': active_users,
            'totalQuestionnaires': total_questionnaires,
            'activeQuestionnaires': active_questionnaires,
            'totalSessions': total_sessions,
            'completedSessions': completed_sessions,
            'totalQuestions': total_questions,
            'totalAnswers': total_answers,
            'totalAuditLogs': total_audit_logs,
        })


class RecentActivityView(APIView):
    """Provide recent activity data"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get recent activity"""
        # Get recent audit logs
        recent_logs = AuditLog.objects.all().order_by('-created_at')[:10]
        data = []

        for log in recent_logs:
            data.append({
                'id': str(log.id),
                'type': log.action.replace('_', ' '),
                'title': f"{log.action.replace('_', ' ').title()}",
                'description': f"Action performed by {log.actor.get_full_name() or log.actor.username if log.actor else 'System'}",
                'timestamp': log.created_at.isoformat()
            })

        return Response(data)


class UserSessionView(APIView):
    """Handle user session operations"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current session for the user"""
        try:
            session = Session.objects.filter(user=request.user, is_completed=False).first()
            if not session:
                return Response({'error': 'No active session found'}, status=status.HTTP_404_NOT_FOUND)

            questions = Question.objects.filter(questionnaire=session.questionnaire).order_by('position')
            current_question = questions[session.current_question_index] if session.current_question_index < len(questions) else None

            # Build questions array for frontend compatibility
            questions_data = [
                {
                    'id': str(q.id),
                    'text': q.question_text,
                    'order': q.position,
                    'type': q.type,
                    'required': q.required,
                    'options': q.options or []
                } for q in questions
            ]

            data = {
                'id': str(session.id),
                'questionnaire_id': str(session.questionnaire.id),
                'questionnaire': {
                    'id': str(session.questionnaire.id),
                    'title': session.questionnaire.title,
                    'description': session.questionnaire.description,
                },
                'current_question_index': session.current_question_index,
                'total_questions': session.total_questions,
                'is_completed': session.is_completed,
                'current_question': {
                    'id': str(current_question.id),
                    'text': current_question.question_text,
                    'type': current_question.type,
                    'options': current_question.options or [],
                    'required': current_question.required,
                } if current_question else None,
                'questions': questions_data,
                'progress': (session.current_question_index / session.total_questions) * 100 if session.total_questions > 0 else 0,
            }

            return Response(data)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SessionDetailView(APIView):
    """Handle session detail operations"""
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        """Get session details"""
        try:
            session = get_object_or_404(Session, id=session_id, user=request.user)
            questions = Question.objects.filter(questionnaire=session.questionnaire).order_by('position')
            answers = Answer.objects.filter(session=session).select_related('question')

            data = {
                'id': str(session.id),
                'questionnaire': {
                    'id': str(session.questionnaire.id),
                    'title': session.questionnaire.title,
                    'description': session.questionnaire.description,
                },
                'current_question_index': session.current_question_index,
                'total_questions': session.total_questions,
                'is_completed': session.is_completed,
                'answers': [
                    {
                        'question_id': str(answer.question.id),
                        'question_text': answer.question.question_text,
                        'answer': answer.answered_at.isoformat(),
                    } for answer in answers
                ],
                'progress': (session.current_question_index / session.total_questions) * 100 if session.total_questions > 0 else 0,
            }

            return Response(data)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, session_id):
        """Update session progress"""
        try:
            session = get_object_or_404(Session, id=session_id, user=request.user)
            
            current_question_index = request.data.get('current_question_index')
            is_completed = request.data.get('is_completed')
            
            if current_question_index is not None:
                session.current_question_index = current_question_index
            if is_completed is not None:
                session.is_completed = is_completed
            
            session.save()

            return Response({
                'id': str(session.id),
                'current_question_index': session.current_question_index,
                'is_completed': session.is_completed,
                'progress': (session.current_question_index / session.total_questions) * 100 if session.total_questions > 0 else 0,
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AnswerCreateView(APIView):
    """Handle answer creation"""
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        """Create an answer for a session"""
        try:
            session = get_object_or_404(Session, id=session_id, user=request.user)
            question_id = request.data.get('question_id')
            answer_text = request.data.get('answer_text')

            if not question_id or answer_text is None:
                return Response({'error': 'question_id and answer_text are required'}, status=status.HTTP_400_BAD_REQUEST)

            question = get_object_or_404(Question, id=question_id, questionnaire=session.questionnaire)

            # Validate that the answer is for the current question in sequence
            expected_question = session.questionnaire.questions.order_by('position')[session.current_question_index] if session.questionnaire.questions.exists() else None
            if expected_question and str(question_id) != str(expected_question.id):
                return Response({
                    'error': 'You must answer questions in order. Please answer the current question first.',
                    'expected_question_id': str(expected_question.id),
                    'current_question_index': session.current_question_index
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create the answer
            answer = Answer.objects.create(
                session=session,
                question=question,
                answer_text=answer_text,
            )

            # Log the action
            AuditLog.objects.create(
                actor=request.user,
                action='answer_submitted',
                object_type='Answer',
                object_id=str(answer.id),
                payload={'question_id': question_id, 'session_id': session_id}
            )

            return Response({
                'id': str(answer.id),
                'question_id': question_id,
                'answer': answer_text,
                'current_question_index': session.current_question_index,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """Handle user profile retrieval"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current user profile"""
        user = request.user
        # Get assigned questionnaire from active session (not completed)
        active_session = Session.objects.filter(user=user, is_completed=False).first()
        assigned_questionnaire_id = str(active_session.questionnaire.id) if active_session else None

        return Response({
            'id': str(user.id),
            'username': user.username,
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'role': 'admin' if user.is_superuser else 'stakeholder',
            'is_active': user.is_active,
            'assigned_questionnaire_id': assigned_questionnaire_id,
            'created_at': user.date_joined.isoformat()
        })
