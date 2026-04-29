import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PostsModule } from './posts/posts.module';
import { StoriesModule } from './stories/stories.module';
import { ListingsModule } from './listings/listings.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { GarageModule } from './garage/garage.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FollowsModule } from './follows/follows.module';
import { MediaModule } from './media/media.module';
import { LoiAiModule } from './loi-ai/loi-ai.module';
import { InsuranceModule } from './insurance/insurance.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { CommercialAccountsModule } from './commercial-accounts/commercial-accounts.module';
import { LegalComplianceModule } from './legal-compliance/legal-compliance.module';
import { ObdModule } from './obd/obd.module';
import { AuditLogModule } from './audit-log/audit-log.module';

export const DOMAIN_MODULES = [
  AuthModule,
  UsersModule,
  ProfilesModule,
  PostsModule,
  StoriesModule,
  ListingsModule,
  VehiclesModule,
  GarageModule,
  MessagesModule,
  NotificationsModule,
  FollowsModule,
  MediaModule,
  LoiAiModule,
  InsuranceModule,
  PaymentsModule,
  AdminModule,
  CommercialAccountsModule,
  LegalComplianceModule,
  ObdModule,
  AuditLogModule,
];

