import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  offer: RTCSessionDescriptionInit;
}

export const useStaffCalls = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    peerConnection: RTCPeerConnection;
    remoteStream: MediaStream;
  } | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!user) return;

    // Subscribe to incoming calls
    const channel = supabase
      .channel(`staff-calls:${user.id}`)
      .on('broadcast', { event: 'incoming_call' }, (payload) => {
        console.log('Incoming call:', payload);
        setIncomingCall(payload.payload as IncomingCall);
        
        // Play ringtone
        const audio = new Audio('/notification.mp3');
        audio.loop = true;
        audio.play().catch(console.error);
        
        toast({
          title: 'Incoming Call',
          description: `${payload.payload.callerName} is calling...`,
        });
      })
      .on('broadcast', { event: 'call_signal' }, async (payload) => {
        console.log('Call signal:', payload);
        await handleSignal(payload.payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const initiateCall = async (calleeId: string, businessId: string) => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      // Add local tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to server
      const { data, error } = await supabase.functions.invoke('staff-call-initiate', {
        body: { calleeId, businessId, offer },
      });

      if (error) throw error;

      const callId = data.call.id;

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          supabase.functions.invoke('staff-call-signal', {
            body: {
              callId,
              signalType: 'ice-candidate',
              signalData: event.candidate,
              targetUserId: calleeId,
            },
          });
        }
      };

      // Handle remote stream
      const remoteStream = new MediaStream();
      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
      };

      setActiveCall({ callId, peerConnection, remoteStream });

      toast({
        title: 'Calling...',
        description: 'Connecting to staff member',
      });

      return callId;
    } catch (error) {
      console.error('Failed to initiate call:', error);
      toast({
        title: 'Call Failed',
        description: 'Could not start the call',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const answerCall = async (call: IncomingCall) => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      // Add local tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Set remote description (offer)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(call.offer));

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send answer
      await supabase.functions.invoke('staff-call-signal', {
        body: {
          callId: call.callId,
          signalType: 'answer',
          signalData: answer,
          targetUserId: call.callerId,
        },
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          supabase.functions.invoke('staff-call-signal', {
            body: {
              callId: call.callId,
              signalType: 'ice-candidate',
              signalData: event.candidate,
              targetUserId: call.callerId,
            },
          });
        }
      };

      // Handle remote stream
      const remoteStream = new MediaStream();
      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
      };

      setActiveCall({ callId: call.callId, peerConnection, remoteStream });
      setIncomingCall(null);

      toast({
        title: 'Call Connected',
        description: `Connected with ${call.callerName}`,
      });
    } catch (error) {
      console.error('Failed to answer call:', error);
      toast({
        title: 'Call Failed',
        description: 'Could not answer the call',
        variant: 'destructive',
      });
    }
  };

  const rejectCall = async (call: IncomingCall) => {
    await supabase.functions.invoke('staff-call-signal', {
      body: {
        callId: call.callId,
        signalType: 'reject',
        targetUserId: call.callerId,
      },
    });
    setIncomingCall(null);
  };

  const endCall = async () => {
    if (!activeCall) return;

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    activeCall.peerConnection.close();

    // Notify server
    await supabase.functions.invoke('staff-call-signal', {
      body: {
        callId: activeCall.callId,
        signalType: 'end',
        targetUserId: 'other', // Will be determined by server
      },
    });

    setActiveCall(null);

    toast({
      title: 'Call Ended',
    });
  };

  const handleSignal = async (signal: any) => {
    if (!activeCall) return;

    try {
      if (signal.signalType === 'answer') {
        await activeCall.peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.signalData)
        );
      } else if (signal.signalType === 'ice-candidate') {
        await activeCall.peerConnection.addIceCandidate(
          new RTCIceCandidate(signal.signalData)
        );
      } else if (signal.signalType === 'end') {
        endCall();
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  };

  return {
    incomingCall,
    activeCall,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
  };
};
