import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSendWhatsAppMessage } from '../api/use-whatsapp'

const schema = z.object({
  to: z
    .string()
    .min(1, 'Recipient number is required')
    .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number (e.g. +919820011223)'),
  body: z.string().min(1, 'Message cannot be empty').max(1000, 'Message is too long'),
})

type FormValues = z.infer<typeof schema>

export function WhatsAppComposer() {
  const sendMessage = useSendWhatsAppMessage()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { to: '', body: '' },
  })

  const onSubmit = handleSubmit((values) => {
    sendMessage.mutate(values, { onSuccess: () => reset() })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Composer</CardTitle>
        <CardDescription>Send a message via the WhatsApp Business channel.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="wa-to">Recipient number</Label>
            <Input id="wa-to" placeholder="+919820011223" {...register('to')} />
            {errors.to && <p className="text-xs text-destructive">{errors.to.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-body">Message</Label>
            <Input id="wa-body" placeholder="Type your message…" {...register('body')} />
            {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={sendMessage.isPending}>
              <Send /> {sendMessage.isPending ? 'Sending…' : 'Send message'}
            </Button>
            {sendMessage.isSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle2 className="size-3.5" /> Sent
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
