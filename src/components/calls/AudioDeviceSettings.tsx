import { useState, useEffect } from 'react';
import { Settings, Mic, Speaker, Headphones, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface AudioDeviceSettingsProps {
  device: any; // Twilio Device instance
  onDeviceChange?: (deviceId: string, type: 'input' | 'output') => void;
}

export const AudioDeviceSettings = ({ device, onDeviceChange }: AudioDeviceSettingsProps) => {
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');
  const [inputVolume, setInputVolume] = useState([100]);
  const [outputVolume, setOutputVolume] = useState([100]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (permissionGranted) {
      enumerateDevices();
      
      // Listen for device changes (plugging/unplugging headphones)
      navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
      };
    }
  }, [permissionGranted]);

  const checkPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionGranted(result.state === 'granted');
      
      result.addEventListener('change', () => {
        setPermissionGranted(result.state === 'granted');
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionGranted(true);
      toast.success('Microphone access granted');
      await enumerateDevices();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast.error('Microphone access denied. Please enable it in your browser settings.');
    }
  };

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      
      setAudioInputDevices(inputs);
      setAudioOutputDevices(outputs);

      // Set default devices if none selected
      if (!selectedInputDevice && inputs.length > 0) {
        const defaultInput = inputs.find(d => d.deviceId === 'default') || inputs[0];
        setSelectedInputDevice(defaultInput.deviceId);
      }
      
      if (!selectedOutputDevice && outputs.length > 0) {
        const defaultOutput = outputs.find(d => d.deviceId === 'default') || outputs[0];
        setSelectedOutputDevice(defaultOutput.deviceId);
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
      toast.error('Failed to load audio devices');
    }
  };

  const handleInputDeviceChange = async (deviceId: string) => {
    setSelectedInputDevice(deviceId);
    
    if (device) {
      try {
        await device.audio?.setInputDevice(deviceId);
        onDeviceChange?.(deviceId, 'input');
        toast.success('Microphone changed successfully');
      } catch (error) {
        console.error('Error changing input device:', error);
        toast.error('Failed to change microphone');
      }
    }
  };

  const handleOutputDeviceChange = async (deviceId: string) => {
    setSelectedOutputDevice(deviceId);
    
    if (device) {
      try {
        await device.audio?.speakerDevices.set(deviceId);
        onDeviceChange?.(deviceId, 'output');
        toast.success('Speaker changed successfully');
      } catch (error) {
        console.error('Error changing output device:', error);
        toast.error('Failed to change speaker');
      }
    }
  };

  const testAudioOutput = () => {
    const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
    audio.volume = outputVolume[0] / 100;
    
    if (selectedOutputDevice) {
      (audio as any).setSinkId?.(selectedOutputDevice);
    }
    
    audio.play().catch(error => {
      console.error('Error testing audio:', error);
      toast.error('Failed to play test sound');
    });
    
    setTimeout(() => audio.pause(), 2000);
    toast.success('Playing test sound for 2 seconds');
  };

  const getDeviceIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('bluetooth') || lowerLabel.includes('wireless')) {
      return <Headphones className="h-4 w-4 text-primary" />;
    }
    if (lowerLabel.includes('headphone') || lowerLabel.includes('headset')) {
      return <Headphones className="h-4 w-4" />;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Audio Device Settings</DialogTitle>
          <DialogDescription>
            Configure your microphone, speakers, and headphones for voice calls
          </DialogDescription>
        </DialogHeader>

        {!permissionGranted ? (
          <div className="space-y-4 py-6">
            <div className="text-center space-y-2">
              <Mic className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Microphone access is required for voice calls
              </p>
            </div>
            <Button onClick={requestPermissions} className="w-full">
              Grant Microphone Access
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Microphone Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Microphone
              </Label>
              <Select value={selectedInputDevice} onValueChange={handleInputDeviceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioInputDevices.map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.label)}
                        <span>{device.label || `Microphone ${device.deviceId.slice(0, 8)}`}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Input Volume</Label>
                <Slider
                  value={inputVolume}
                  onValueChange={setInputVolume}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Speaker/Headphones Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Speaker className="h-4 w-4" />
                Speaker / Headphones
              </Label>
              <Select value={selectedOutputDevice} onValueChange={handleOutputDeviceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent>
                  {audioOutputDevices.map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.label)}
                        <span>{device.label || `Speaker ${device.deviceId.slice(0, 8)}`}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Output Volume</Label>
                <Slider
                  value={outputVolume}
                  onValueChange={setOutputVolume}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
              
              <Button 
                onClick={testAudioOutput} 
                variant="outline" 
                size="sm"
                className="w-full"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Test Audio Output
              </Button>
            </div>

            {/* Device Status Info */}
            <div className="rounded-lg bg-muted p-3 space-y-1 text-xs">
              <p className="font-medium">Connected Devices:</p>
              <p className="text-muted-foreground">
                {audioInputDevices.length} microphone(s), {audioOutputDevices.length} speaker(s)
              </p>
              {audioInputDevices.some(d => d.label.toLowerCase().includes('bluetooth')) && (
                <p className="text-primary flex items-center gap-1">
                  <Headphones className="h-3 w-3" />
                  Bluetooth device detected
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};