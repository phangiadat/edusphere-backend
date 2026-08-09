import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeAssignmentDto } from './dto/grade-assignment.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(Role.INSTRUCTOR)
  @Post()
  create(@Body() createAssignmentDto: CreateAssignmentDto, @Req() req) {
    return this.assignmentsService.create(req.user.id, createAssignmentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/submit')
  submitAssignment(
    @Param('id') id: string,
    @Body() submitDto: SubmitAssignmentDto,
    @Req() req,
  ) {
    return this.assignmentsService.submitAssignment(req.user.id, id, submitDto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.INSTRUCTOR)
  @Get(':id/submissions')
  getSubmission(@Param('id') id: string, @Req() req) {
    return this.assignmentsService.getSubmissions(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.INSTRUCTOR)
  @Patch('submissions/:submissionId/grade')
  gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() gradeDto: GradeAssignmentDto,
    @Req() req,
  ) {
    return this.assignmentsService.gradeSubmission(
      req.user.id,
      submissionId,
      gradeDto,
    );
  }
}
