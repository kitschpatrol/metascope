PUBLIC_KEY = ENV['PUBLIC_KEY_PATH'] || ''
PRIVATE_KEY = ENV['PRIVATE_KEY_PATH'] || ''

if File.exist?(PUBLIC_KEY) ^ File.exist?(PRIVATE_KEY)
  fail 'Need to supply both public and private key to sign GEMs!'
end

sign_gems = File.exist?(PUBLIC_KEY) && File.exist?(PRIVATE_KEY)

MAJOR_VERSION = '1.0'
MINOR_VERSION = ENV['BUILD_NUMBER'] || '25'
VERSION = Gem::Version.new("#{MAJOR_VERSION}.#{MINOR_VERSION}")

Gem::Specification.new do |s|
  s.name = 'bswtech-jenkins-gem'
  s.files = Dir.glob('lib/**/*.rb') - Dir.glob('**/*_spec.rb')
  s.version = VERSION
  s.summary = 'Jenkins GEM utility'
  s.description = s.summary
  s.rdoc_options << '--inline-source' << '--line-numbers'
  s.author = 'Brady Wied'
  s.email = 'brady@bswtechconsulting.com'
  s.add_runtime_dependency 'rubyzip', '~> 1.2'
  s.add_runtime_dependency 'sinatra', '~> 2.0'
  s.add_runtime_dependency 'gemfury', '~> 0.7'
  s.executables << 'jenkins_bundle_install'
  s.executables << 'jenkins_seed'
  s.executables << 'jenkins_manual_fetch'
  s.executables << 'jenkins_bundle_update'
  s.cert_chain = [PUBLIC_KEY] if sign_gems
  s.signing_key = PRIVATE_KEY if sign_gems
end
