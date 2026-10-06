import { Body,Controller,Get,Headers,Inject,Param,Patch,Post,Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor,Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { EngagementService } from './engagement.service';
@ApiTags('Xabar, vazifa, anketa va yordam') @Controller()
export class EngagementController{
  constructor(@Inject(EngagementService) private readonly s:EngagementService){}
  @Get('messages') messages(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.messages(a,q);}
  @Post('messages') @Roles('STAFF','SUPERADMIN') send(@CurrentActor() a:Actor,@Body() b:unknown){return this.s.send(a,b);}
  @Post('messages/:id/receipt') receipt(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.receipt(a,id,b);}
  @Post('superadmin/announcements') @Roles('SUPERADMIN') broadcast(@CurrentActor() a:Actor,@Body() b:unknown){return this.s.broadcast(a,b);}
  @Get('tasks') tasks(@CurrentActor() a:Actor){return this.s.tasks(a);}
  @Post('tasks') @Roles('STAFF','SUPERADMIN') task(@CurrentActor() a:Actor,@Body() b:unknown){return this.s.task(a,b);}
  @Patch('tasks/:id') reply(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.taskReply(a,id,b);}
  @Post('superadmin/surveys') @Roles('SUPERADMIN') survey(@CurrentActor() a:Actor,@Body() b:unknown){return this.s.survey(a,b);}
  @Get('surveys') surveys(@CurrentActor() a:Actor){return this.s.surveys(a);}
  @Post('surveys/:id/responses') answer(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.answer(a,id,b);}
  @Post('reviews') @Roles('CUSTOMER') review(@CurrentActor() a:Actor,@Body() b:unknown){return this.s.review(a,b);}
  @Get('partner/reviews') @Roles('STAFF','SUPERADMIN') reviews(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.reviewList(a,q);}
  @Post('partner/reviews/:id/reply') @Roles('STAFF','SUPERADMIN') reviewReply(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.reviewReply(a,id,b);}
  @Post('superadmin/reviews/:id/moderate') @Roles('SUPERADMIN') moderate(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.moderateReview(a,id,b);}
  @Get('support/tickets') tickets(@CurrentActor() a:Actor){return this.s.tickets(a);}
  @Post('support/tickets') ticket(@CurrentActor() a:Actor,@Body() b:unknown,@Headers('idempotency-key') key?:string){return this.s.ticket(a,b,key);}
  @Get('support/tickets/:id') ticketGet(@CurrentActor() a:Actor,@Param('id') id:string){return this.s.ticketGet(a,id);}
  @Post('support/tickets/:id/messages') ticketReply(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') key?:string){return this.s.ticketReply(a,id,b,key);}
  @Get('notifications') notifications(@CurrentActor() a:Actor){return this.s.notifications(a);}
  @Post('notifications/:id/read') notificationRead(@CurrentActor() a:Actor,@Param('id') id:string){return this.s.notificationRead(a,id);}
}
